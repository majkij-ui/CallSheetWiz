"use client"

import { useState, useEffect } from "react"
import { PlannerHeader } from "@/components/planner-header"
import { VisualTimeline } from "@/components/visual-timeline"
import { CallSheet } from "@/components/call-sheet"
import { EventModal } from "@/components/event-modal"
import { ScheduleManagerModal } from "@/components/schedule-manager-modal"
import {
  defaultCategories,
  initialPlannerEvents,
} from "@/lib/schedule-data"
import type { Category, PlannerEvent, SavedDay } from "@/lib/schedule-types"
import { setEventStart, setEventDuration } from "@/lib/editing-engine"
import { getDurationMinutes } from "@/lib/time"
import { getSavedDays, setSavedDays } from "@/lib/saved-days-storage"
import { Separator } from "@/components/ui/separator"

export default function DayPlannerPage() {
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [events, setEvents] = useState<PlannerEvent[]>(initialPlannerEvents)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)
  const [managerOpen, setManagerOpen] = useState(false)

  const [savedDays, setSavedDaysState] = useState<SavedDay[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return
    setSavedDaysState(getSavedDays())
  }, [isMounted])

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
      date: new Date().toISOString(),
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
        <PlannerHeader onAddEvent={handleAddEvent} onManageDays={() => setManagerOpen(true)} />
        <Separator className="bg-border" />
        <VisualTimeline
          events={events}
          categories={categories}
          onEventChange={handleEventChange}
        />
        <Separator className="bg-border" />
        <CallSheet
          events={events}
          categories={categories}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      </div>

      <EventModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        categories={categories}
        onSave={handleSaveEvent}
      />

      <ScheduleManagerModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        savedDays={savedDays}
        onSaveCurrent={handleSaveCurrentDay}
        onLoad={handleLoadDay}
        onDelete={handleDeleteDay}
      />
    </main>
  )
}
