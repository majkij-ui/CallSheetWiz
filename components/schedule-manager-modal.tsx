"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SavedDay } from "@/lib/schedule-types"
import { FolderOpen, Trash2 } from "lucide-react"

interface ScheduleManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedDays: SavedDay[]
  onSaveCurrent: (dayTitle: string) => void
  onLoad: (day: SavedDay) => void
  onDelete: (dayId: string) => void
}

export function ScheduleManagerModal({
  open,
  onOpenChange,
  savedDays,
  onSaveCurrent,
  onLoad,
  onDelete,
}: ScheduleManagerModalProps) {
  const [dayTitle, setDayTitle] = useState("")

  const handleSaveCurrent = () => {
    const title = dayTitle.trim()
    if (!title) return
    onSaveCurrent(title)
    setDayTitle("")
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="size-5" />
            Manage Shooting Days
          </DialogTitle>
          <DialogDescription>
            Save the current day to browser storage, or load a previously saved day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Top: Save current */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-medium text-foreground">Save current day</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="day-title">Day title</Label>
                <Input
                  id="day-title"
                  placeholder="e.g. Day 1 - Studio Shoot"
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSaveCurrent())}
                />
              </div>
              <Button
                type="button"
                onClick={handleSaveCurrent}
                disabled={!dayTitle.trim()}
                className="sm:shrink-0"
              >
                Save current day
              </Button>
            </div>
          </div>

          {/* Bottom: Saved days list */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Saved days</h3>
            <ScrollArea className="h-[240px] rounded-md border border-border">
              <div className="p-2 space-y-1">
                {savedDays.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No saved days yet. Save the current day above.
                  </p>
                ) : (
                  savedDays.map((day) => (
                    <div
                      key={day.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {day.dayTitle || "Untitled day"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(day.date)} · {day.events.length} event{day.events.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onLoad(day)}
                        >
                          Load
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => onDelete(day.id)}
                          aria-label={`Delete ${day.dayTitle || "this day"}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
