"use client"

import { useState, useEffect } from "react"
import { PlannerHeader } from "@/components/planner-header"
import { VisualTimeline } from "@/components/visual-timeline"
import { CallSheet } from "@/components/call-sheet"
import { EventModal } from "@/components/event-modal"
import { ScheduleManagerModal } from "@/components/schedule-manager-modal"
import { TagManagerModal } from "@/components/tag-manager-modal"
import {
  defaultCategories,
  initialPlannerEvents,
} from "@/lib/schedule-data"
import type { Category, PlannerEvent, SavedDay } from "@/lib/schedule-types"
import { setEventStart, setEventDuration } from "@/lib/editing-engine"
import { getDurationMinutes } from "@/lib/time"
import { getSavedDays, setSavedDays } from "@/lib/saved-days-storage"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
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
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return
    setSavedDaysState(getSavedDays())
  }, [isMounted])

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
  }

  const handleLoadDay = (day: SavedDay) => {
    setEvents(day.events.map((e) => ({ ...e })))
    setCategories(day.categories.map((c) => ({ ...c })))
    setTitle(day.dayTitle || "Untitled Shoot")
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
    setSavedDaysState((prev) => {
      const next = prev.filter((d) => d.id !== dayId)
      setSavedDays(next)
      return next
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-6">
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
        />
        <Separator className="bg-border" />
        <VisualTimeline
          events={events}
          categories={categories}
          onEventChange={handleEventChange}
        />
        <div className="flex justify-center">
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
      />

      <TagManagerModal
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        categories={categories}
        onAddTag={handleAddTag}
        onDeleteTag={handleDeleteTag}
      />
    </main>
  )
}
