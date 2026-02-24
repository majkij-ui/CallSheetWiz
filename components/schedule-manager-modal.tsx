"use client"

import { useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import type { SavedDay } from "@/lib/schedule-types"
import { parseSavedDaysFile } from "@/lib/saved-days-storage"
import { FolderOpen, Trash2, Download, Upload } from "lucide-react"

/** Sanitize day title for use in a filename. */
function sanitizeFilename(title: string): string {
  return title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim() || "untitled-day"
}

interface ScheduleManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedDays: SavedDay[]
  dayTitle: string
  onDayTitleChange: (value: string) => void
  onSaveCurrent: (dayTitle: string) => void
  onLoad: (day: SavedDay) => void
  onDelete: (dayId: string) => void
  onImport: (mergedDays: SavedDay[]) => void
}

export function ScheduleManagerModal({
  open,
  onOpenChange,
  savedDays,
  dayTitle,
  onDayTitleChange,
  onSaveCurrent,
  onLoad,
  onDelete,
  onImport,
}: ScheduleManagerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveCurrent = () => {
    const title = dayTitle.trim()
    if (!title) return
    onSaveCurrent(title)
  }

  const handleExportAll = () => {
    try {
      const json = JSON.stringify(savedDays, null, 2)
      const date = new Date().toISOString().slice(0, 10)
      const filename = `production-schedules-${date}.json`
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({
        title: "Export failed",
        description: "Could not export schedules.",
        variant: "destructive",
      })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : ""
        const parsed = parseSavedDaysFile(text)
        if (parsed === null) {
          toast({
            title: "Error: Invalid file format",
            description: "The file could not be read or does not contain valid schedule data.",
            variant: "destructive",
          })
          return
        }
        const existingIds = new Set(savedDays.map((d) => d.id))
        const toAdd: SavedDay[] = parsed.map((day) => {
          if (existingIds.has(day.id)) {
            const newId = crypto.randomUUID()
            existingIds.add(newId)
            return {
              ...day,
              id: newId,
              dayTitle: `${day.dayTitle || "Untitled day"} (Imported)`,
            }
          }
          existingIds.add(day.id)
          return day
        })
        const merged: SavedDay[] = [...savedDays, ...toAdd]
        onImport(merged)
        toast({
          title: "Schedules imported successfully!",
          description: `${parsed.length} day(s) added.`,
        })
      } catch {
        toast({
          title: "Error: Invalid file format",
          description: "The file could not be read or does not contain valid schedule data.",
          variant: "destructive",
        })
      }
    }
    reader.onerror = () => {
      toast({
        title: "Error: Invalid file format",
        description: "The file could not be read.",
        variant: "destructive",
      })
    }
    reader.readAsText(file, "UTF-8")
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

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    } catch {
      return ""
    }
  }

  const handleExportOne = (day: SavedDay) => {
    try {
      const json = JSON.stringify(day, null, 2)
      const filename = `${sanitizeFilename(day.dayTitle || "Untitled day")}.json`
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({
        title: "Export failed",
        description: "Could not export this day.",
        variant: "destructive",
      })
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden
          onChange={handleFileChange}
        />

        <div className="flex flex-col gap-6">
          {/* Export / Import */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportAll}
              disabled={savedDays.length === 0}
            >
              <Download className="size-4" />
              Export All Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleImportClick}
            >
              <Upload className="size-4" />
              Import File
            </Button>
          </div>

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
                  onChange={(e) => onDayTitleChange(e.target.value)}
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
                          {formatDate(day.date)}
                          {formatTime(day.date) && ` · ${formatTime(day.date)}`} · {day.events.length} event{day.events.length !== 1 ? "s" : ""}
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
                          className="size-8"
                          onClick={() => handleExportOne(day)}
                          aria-label={`Export ${day.dayTitle || "this day"}`}
                        >
                          <Download className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              aria-label={`Delete ${day.dayTitle || "this day"}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete {day.dayTitle || "Untitled day"}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this day from your browser&apos;s storage.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => onDelete(day.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
