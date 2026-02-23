"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Clapperboard, Calendar, Plus, FolderOpen } from "lucide-react"

interface PlannerHeaderProps {
  onAddEvent: () => void
  onManageDays: () => void
}

export function PlannerHeader({ onAddEvent, onManageDays }: PlannerHeaderProps) {
  const today = new Date()
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Clapperboard className="size-5 text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl text-balance">
              Commercial Shoot - Day 1
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs"
            >
              On Schedule
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-3.5" />
            <time dateTime={today.toISOString().split("T")[0]}>{formattedDate}</time>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <Button
          variant="outline"
          className="gap-2"
          onClick={onAddEvent}
        >
          <Plus className="size-4" />
          Add Event
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
          className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          onClick={() => window.print()}
        >
          <Download className="size-4" />
          Export Call Sheet
        </Button>
      </div>
    </header>
  )
}
