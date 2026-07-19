"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TimeSpinnerInput } from "@/components/time-spinner-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import type { Category, PlannerEvent } from "@/lib/schedule-types"
import { getCategoryStyle } from "@/lib/schedule-types"
import {
  minutesToHHMM,
  hhmmToMinutes,
  getDurationMinutes,
  clampMinutesToDay,
} from "@/lib/time"

/** Default start when timeline is empty (06:00). */
const DEFAULT_START_WHEN_EMPTY = 360

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: PlannerEvent | null
  categories: Category[]
  /** When adding (no event), use this as default start time (minutes from midnight). */
  defaultStartMinutes?: number
  onSave: (event: PlannerEvent) => void
}

export function EventModal({
  open,
  onOpenChange,
  event,
  categories,
  defaultStartMinutes = DEFAULT_START_WHEN_EMPTY,
  onSave,
}: EventModalProps) {
  const isEditing = !!event
  const firstCategoryId = categories[0]?.id ?? ""

  const [title, setTitle] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [durationInput, setDurationInput] = useState("")
  const [notes, setNotes] = useState("")
  const [categoryId, setCategoryId] = useState(firstCategoryId)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!categories.length) return
    if (categoryId && categories.some((cat) => cat.id === categoryId)) return
    setCategoryId(categories[0].id)
  }, [categories, categoryId])

  // Derive duration (minutes) from start and end for display
  const startMinutes = hhmmToMinutes(startTime)
  const endMinutes = hhmmToMinutes(endTime)
  const derivedDuration =
    startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
      ? getDurationMinutes(startMinutes, endMinutes)
      : 0

  // Sync duration input when start/end change—only when both are set and valid (keeps add-event empty end/duration until user fills them)
  useEffect(() => {
    if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
      setDurationInput(String(derivedDuration))
    }
  }, [startTime, endTime])

  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title)
        setStartTime(minutesToHHMM(event.startMinutes))
        setEndTime(minutesToHHMM(event.endMinutes))
        setDurationInput(String(getDurationMinutes(event.startMinutes, event.endMinutes)))
        setNotes(event.notes ?? "")
        setCategoryId(event.categoryId)
      } else {
        setTitle("")
        setStartTime(minutesToHHMM(defaultStartMinutes))
        setEndTime("")
        setDurationInput("")
        setNotes("")
        setCategoryId(categories[0]?.id ?? "")
      }
      setErrors({})
    }
  }, [open, event, categories, defaultStartMinutes])

  const handleStartChange = (value: string) => {
    setStartTime(value)
    const startMin = hhmmToMinutes(value)
    const endMin = hhmmToMinutes(endTime)
    if (startMin !== null && endMin !== null && startMin > endMin) {
      setEndTime(value)
    }
  }

  const handleEndChange = (value: string) => {
    setEndTime(value)
    const endMin = hhmmToMinutes(value)
    const startMin = hhmmToMinutes(startTime)
    if (startMin !== null && endMin !== null && endMin < startMin) {
      setStartTime(value)
    }
  }

  const handleDurationChange = (value: string) => {
    const num = parseInt(value, 10)
    if (value === "" || Number.isNaN(num)) {
      setDurationInput(value)
      return
    }
    const duration = Math.max(0, num)
    setDurationInput(String(duration))
    const startMin = hhmmToMinutes(startTime)
    if (startMin !== null) {
      const newEndMin = clampMinutesToDay(startMin + duration)
      setEndTime(minutesToHHMM(newEndMin))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = "Title is required"
    }

    const startMin = hhmmToMinutes(startTime)
    if (startMin === null) {
      newErrors.startTime = "Valid time (HH:MM)"
    }

    const endMin = hhmmToMinutes(endTime)
    if (endMin === null) {
      newErrors.endTime = "Valid time (HH:MM)"
    }

    if (startMin !== null && endMin !== null && endMin <= startMin) {
      newErrors.endTime = "End must be after start"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const startMinutesVal = hhmmToMinutes(startTime)!
    const endMinutesVal = hhmmToMinutes(endTime)!

    const duration = getDurationMinutes(startMinutesVal, endMinutesVal)
    if (duration === 0 || endMinutesVal === startMinutesVal) {
      toast({
        title: "Invalid duration",
        description: "Please specify duration or end time.",
        variant: "destructive",
      })
      return
    }

    onSave({
      id: event?.id ?? crypto.randomUUID(),
      title: title.trim(),
      startMinutes: startMinutesVal,
      endMinutes: endMinutesVal,
      categoryId: categoryId || firstCategoryId,
      notes: notes.trim() || undefined,
      subItems: event?.subItems ?? [],
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Event" : "Add Event"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this schedule event."
              : "Add a new event to the production schedule."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-modal-title">Title</Label>
            <Input
              id="event-modal-title"
              placeholder="e.g. Lighting Setup - Scene 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-modal-category">Tag</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="event-modal-category" className="w-full">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => {
                  const style = getCategoryStyle(cat)
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: style.dotColor }}
                        />
                        {style.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-modal-start">Start (HH:MM)</Label>
              <TimeSpinnerInput
                id="event-modal-start"
                label="Start time"
                value={startTime}
                onChange={handleStartChange}
                fallbackMinutes={defaultStartMinutes}
                invalid={!!errors.startTime}
              />
              {errors.startTime && (
                <p className="text-xs text-destructive">{errors.startTime}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-modal-end">End (HH:MM)</Label>
              <TimeSpinnerInput
                id="event-modal-end"
                label="End time"
                value={endTime}
                onChange={handleEndChange}
                fallbackMinutes={startMinutes ?? defaultStartMinutes}
                invalid={!!errors.endTime}
              />
              {errors.endTime && (
                <p className="text-xs text-destructive">{errors.endTime}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-modal-duration">Duration (min)</Label>
              <Input
                id="event-modal-duration"
                type="number"
                min={0}
                max={1440}
                value={durationInput}
                onChange={(e) => handleDurationChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-modal-notes">Notes</Label>
            <Textarea
              id="event-modal-notes"
              placeholder="Optional notes for the crew..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Save Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
