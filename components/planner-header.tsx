"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import {
  Download,
  Calendar as CalendarIcon,
  FolderOpen,
  Tag,
  Trash2,
  Save,
} from "lucide-react"
import { formatLocalYmd, formatLongDate } from "@/lib/time"

interface PlannerHeaderProps {
  title: string
  shootDate: Date | null
  onTitleChange: () => void
  onDateChange: (date: Date | undefined) => void
  onManageDays: () => void
  onManageTags: () => void
  onClearDay: () => void
  onSave: () => void
  onExport: () => void
}

export function PlannerHeader({
  title,
  shootDate,
  onTitleChange,
  onDateChange,
  onManageDays,
  onManageTags,
  onClearDay,
  onSave,
  onExport,
}: PlannerHeaderProps) {
  // null until the page sets today's date after mount (avoids SSR/client TZ mismatch)
  const formattedDate = shootDate ? formatLongDate(shootDate) : ""
  const dateTime = shootDate ? formatLocalYmd(shootDate) : undefined

  return (
    <header className="planner-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-card">
          <img
            src="/header-logo.png"
            alt="CallSheetWiz logo"
            className="size-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="text-left text-xl font-semibold tracking-tight text-foreground sm:text-2xl text-balance hover:text-foreground/85 transition-colors"
              onClick={onTitleChange}
            >
              {title}
            </button>
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: "rgba(255, 103, 0, 0.45)",
                backgroundColor: "rgba(255, 103, 0, 0.18)",
                color: "#ff6700",
              }}
            >
              by NonoiseMedia
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={onManageDays}
              className="hover:text-foreground transition-colors"
              aria-label="Open day manager"
            >
              <CalendarIcon className="size-3.5" />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="hover:text-foreground transition-colors"
                  aria-label="Choose shoot date"
                >
                  <time dateTime={dateTime}>{formattedDate || "Choose date"}</time>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={shootDate ?? undefined}
                  onSelect={onDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      <div className="planner-header-actions flex items-center gap-2 self-start sm:self-auto">
        <Button variant="outline" className="gap-2" onClick={onSave}>
          <Save className="size-4" />
          Save
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={onManageDays}
        >
          <FolderOpen className="size-4" />
          Manage Days
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={onManageTags}
        >
          <Tag className="size-4" />
          Manage Tags
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 text-foreground hover:text-foreground hover:bg-red-500/10"
            >
              <Trash2 className="size-4" />
              Clear Day
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you absolutely sure? This will delete all events on the current timeline. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onClearDay}
              >
                Clear Timeline
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          onClick={onExport}
        >
          <Download className="size-4" />
          Export Call Sheet
        </Button>
      </div>
    </header>
  )
}
