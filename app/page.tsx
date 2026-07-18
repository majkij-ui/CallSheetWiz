"use client"

import { useState, useEffect } from "react"
import { PlannerHeader } from "@/components/planner-header"
import { VisualTimeline } from "@/components/visual-timeline"
import { CallSheet } from "@/components/call-sheet"
import { EventModal } from "@/components/event-modal"
import { ScheduleManagerModal } from "@/components/schedule-manager-modal"
import { TagManagerModal } from "@/components/tag-manager-modal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  defaultCategories,
  initialPlannerEvents,
} from "@/lib/schedule-data"
import type { Category, PlannerEvent, SavedDay } from "@/lib/schedule-types"
import { setEventStart, setEventDuration } from "@/lib/editing-engine"
import { getDurationMinutes } from "@/lib/time"
import { getSavedDays, setSavedDays } from "@/lib/saved-days-storage"
import { printCallSheet } from "@/lib/print-call-sheet"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"

export default function DayPlannerPage() {
  const [title, setTitle] = useState("Untitled Shoot")
  const [shootDate, setShootDate] = useState<Date>(new Date())
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [events, setEvents] = useState<PlannerEvent[]>(initialPlannerEvents)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)
  const [managerOpen, setManagerOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)

  const [savedDays, setSavedDaysState] = useState<SavedDay[]>([])
  const [currentDayId, setCurrentDayId] = useState<string | null>(null)
  const [saveNewDayDialogOpen, setSaveNewDayDialogOpen] = useState(false)
  const [saveNewDayTitle, setSaveNewDayTitle] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return
    setSavedDaysState(getSavedDays())
  }, [isMounted])

  const handleExportCallSheet = () => {
    const result = printCallSheet({
      title,
      shootDate,
      events,
      categories,
    })
    if (result === "downloaded") {
      toast({
        title: "Call sheet downloaded",
        description:
          "Open the HTML file in Chrome or Safari to print to PDF. Printing inside this preview can crash the editor.",
      })
    }
  }

  // Intercept Cmd/Ctrl+P so the live app never enters print media (crashes
  // Cursor / Electron previews). Route through the detached call-sheet printer.
  useEffect(() => {
    if (!isMounted) return
    const onKeyDown = (event: KeyboardEvent) => {
      const isPrint =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p"
      if (!isPrint) return
      event.preventDefault()
      const result = printCallSheet({
        title,
        shootDate,
        events,
        categories,
      })
      if (result === "downloaded") {
        toast({
          title: "Call sheet downloaded",
          description:
            "Open the HTML file in Chrome or Safari to print to PDF. Printing inside this preview can crash the editor.",
        })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isMounted, title, shootDate, events, categories])

  const normalizeDateForStorage = (date: Date): string => {
    const normalized = new Date(date)
    // Persist at noon local time to avoid timezone date rollover.
    normalized.setHours(12, 0, 0, 0)
    return normalized.toISOString()
  }

  const handleAddEvent = () => {
    setEditingEvent(null)
    setDialogOpen(true)
  }

  const handleEditEvent = (event: PlannerEvent) => {
    setEditingEvent(event)
    setDialogOpen(true)
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  const handleUpdateEvent = (updatedEvent: PlannerEvent) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
    )
  }

  const handleClearDay = () => {
    setEvents([])
    setCurrentDayId(null)
  }

  const handleAddTag = (tag: Category) => {
    setCategories((prev) => [...prev, tag])
  }

  const handleDeleteTag = (tagId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== tagId))
    // Fallback to neutral gray by clearing the missing tag id.
    setEvents((prev) =>
      prev.map((event) =>
        event.categoryId === tagId ? { ...event, categoryId: "" } : event
      )
    )
  }

  const handleSaveEvent = (event: PlannerEvent) => {
    setEvents((prev) => {
      const existingIndex = prev.findIndex((e) => e.id === event.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = event
        return updated
      }
      return [...prev, event]
    })
    setDialogOpen(false)
    setEditingEvent(null)
  }

  const handleSaveCurrentDay = (dayTitle: string) => {
    if (!isMounted) return
    const day: SavedDay = {
      id: crypto.randomUUID(),
      dayTitle: dayTitle.trim(),
      date: normalizeDateForStorage(shootDate),
      events: events.map((e) => ({ ...e })),
      categories: categories.map((c) => ({ ...c })),
    }
    setSavedDaysState((prev) => {
      const next = [...prev, day]
      setSavedDays(next)
      return next
    })
    setCurrentDayId(day.id)
    setTitle(day.dayTitle)
  }

  const handleSaveNewDayFromDialog = () => {
    const name = saveNewDayTitle.trim()
    if (!name || !isMounted) return
    const day: SavedDay = {
      id: crypto.randomUUID(),
      dayTitle: name,
      date: normalizeDateForStorage(shootDate),
      events: events.map((e) => ({ ...e })),
      categories: categories.map((c) => ({ ...c })),
    }
    setSavedDaysState((prev) => {
      const next = [...prev, day]
      setSavedDays(next)
      return next
    })
    setCurrentDayId(day.id)
    setTitle(name)
    setSaveNewDayDialogOpen(false)
    setSaveNewDayTitle("")
    toast({
      title: "Progress saved",
      description: `Progress saved to ${name}`,
    })
  }

  const handleSaveInHeader = () => {
    if (!isMounted) return
    const existing = currentDayId ? savedDays.find((d) => d.id === currentDayId) : null
    if (existing) {
      const updated: SavedDay = {
        ...existing,
        dayTitle: title.trim() || existing.dayTitle,
        date: normalizeDateForStorage(shootDate),
        events: events.map((e) => ({ ...e })),
        categories: categories.map((c) => ({ ...c })),
      }
      setSavedDaysState((prev) => {
        const next = prev.map((d) => (d.id === currentDayId ? updated : d))
        setSavedDays(next)
        return next
      })
      toast({
        title: "Progress saved",
        description: `Progress saved to ${updated.dayTitle || "Untitled"}`,
      })
    } else {
      setSaveNewDayTitle(title.trim() || "Untitled Shoot")
      setSaveNewDayDialogOpen(true)
    }
  }

  const handleLoadDay = (day: SavedDay) => {
    setEvents(day.events.map((e) => ({ ...e })))
    setCategories(day.categories.map((c) => ({ ...c })))
    setTitle(day.dayTitle || "Untitled Shoot")
    setCurrentDayId(day.id)
    const parsed = new Date(day.date)
    if (!Number.isNaN(parsed.getTime())) {
      setShootDate(parsed)
    }
    setManagerOpen(false)
  }

  const handleEventChange = (
    eventId: string,
    updates: { startMinutes?: number; endMinutes?: number }
  ) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === eventId)
      if (idx < 0) return prev
      const event = prev[idx]
      let next = event
      if (updates.startMinutes != null) {
        next = setEventStart(event, updates.startMinutes)
      }
      if (updates.endMinutes != null) {
        next = setEventDuration(next, getDurationMinutes(next.startMinutes, updates.endMinutes))
      }
      const out = [...prev]
      out[idx] = next
      return out
    })
  }

  const handleDeleteDay = (dayId: string) => {
    if (!isMounted) return
    if (currentDayId === dayId) setCurrentDayId(null)
    setSavedDaysState((prev) => {
      const next = prev.filter((d) => d.id !== dayId)
      setSavedDays(next)
      return next
    })
  }

  const handleImportDays = (mergedDays: SavedDay[]) => {
    if (!isMounted) return
    setSavedDays(mergedDays)
    setSavedDaysState(mergedDays)
  }

  const printDate = shootDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-6">
        <div className="print-call-sheet-header" aria-hidden="true">
          <h1>{title}</h1>
          <p>{printDate}</p>
        </div>
        <PlannerHeader
          title={title}
          shootDate={shootDate}
          onTitleChange={() => setManagerOpen(true)}
          onDateChange={(date) => {
            if (date) setShootDate(date)
          }}
          onManageDays={() => setManagerOpen(true)}
          onManageTags={() => setTagManagerOpen(true)}
          onClearDay={handleClearDay}
          onSave={handleSaveInHeader}
          onExport={handleExportCallSheet}
        />
        <Separator className="bg-border" />
        <div className="call-sheet-timeline">
          <VisualTimeline
            events={events}
            categories={categories}
            onEventChange={handleEventChange}
          />
        </div>
        <div className="call-sheet-add-event flex justify-center">
          <Button
            onClick={handleAddEvent}
            className="h-11 gap-2 rounded-full px-7 bg-[#ff6700] text-white hover:bg-[#ff6700]/90 shadow-[0_0_24px_rgba(255,103,0,0.35)]"
          >
            <Plus className="size-4" />
            Add Event
          </Button>
        </div>
        <Separator className="bg-border" />
        <CallSheet
          events={events}
          categories={categories}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          onUpdateEvent={handleUpdateEvent}
        />
        <div className="call-sheet-add-event flex justify-center pt-1">
          <Button
            onClick={handleAddEvent}
            className="h-11 gap-2 rounded-full px-7 bg-[#ff6700] text-white hover:bg-[#ff6700]/90 shadow-[0_0_24px_rgba(255,103,0,0.35)]"
          >
            <Plus className="size-4" />
            Add Event
          </Button>
        </div>
      </div>

      <EventModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        categories={categories}
        defaultStartMinutes={
          events.length > 0 ? Math.max(...events.map((e) => e.endMinutes)) : 360
        }
        onSave={handleSaveEvent}
      />

      <ScheduleManagerModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        savedDays={savedDays}
        dayTitle={title}
        onDayTitleChange={setTitle}
        onSaveCurrent={handleSaveCurrentDay}
        onLoad={handleLoadDay}
        onDelete={handleDeleteDay}
        onImport={handleImportDays}
      />

      <TagManagerModal
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        categories={categories}
        onAddTag={handleAddTag}
        onDeleteTag={handleDeleteTag}
      />

      <Dialog open={saveNewDayDialogOpen} onOpenChange={setSaveNewDayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save New Day</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Give this day a name to save it to your browser storage.
          </p>
          <div className="space-y-2">
            <Label htmlFor="save-new-day-title">Day title</Label>
            <Input
              id="save-new-day-title"
              placeholder="e.g. Day 1 - Studio Shoot"
              value={saveNewDayTitle}
              onChange={(e) => setSaveNewDayTitle(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleSaveNewDayFromDialog())
              }
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveNewDayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNewDayFromDialog}
              disabled={!saveNewDayTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
