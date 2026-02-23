"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { Category, PlannerEvent } from "@/lib/schedule-types"
import { getCategoryStyle } from "@/lib/schedule-types"
import { minutesToHHMM, getDurationMinutes } from "@/lib/time"
import { Clock, StickyNote, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CallSheetProps {
  events: PlannerEvent[]
  categories: Category[]
  onEdit: (event: PlannerEvent) => void
  onDelete: (eventId: string) => void
}

export function CallSheet({ events, categories, onEdit, onDelete }: CallSheetProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes)

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const completedCount = checkedItems.size
  const totalCount = events.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Call Sheet
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            {completedCount}/{totalCount} completed
          </span>
          <div className="w-24 h-1.5 rounded-full bg-accent overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {sorted.map((event) => {
          const category = categoryMap.get(event.categoryId)
          const config = category ? getCategoryStyle(category) : { label: "Uncategorized", border: "border-border", bg: "bg-muted/50", text: "text-muted-foreground", dot: "bg-muted-foreground" }
          const isChecked = checkedItems.has(event.id)
          const duration = getDurationMinutes(event.startMinutes, event.endMinutes)
          const durationStr =
            duration >= 60
              ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}m` : ""}`
              : `${duration}m`

          return (
            <div
              key={event.id}
              className={`group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50 ${
                isChecked ? "opacity-50" : ""
              }`}
            >
              <Checkbox
                id={`event-${event.id}`}
                checked={isChecked}
                onCheckedChange={() => toggleItem(event.id)}
                className="shrink-0"
                aria-label={`Mark "${event.title}" as complete`}
              />

              <div className="flex items-center gap-2 shrink-0 w-32 sm:w-40">
                <Clock className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-foreground">
                  {minutesToHHMM(event.startMinutes)}
                  {" - "}
                  {minutesToHHMM(event.endMinutes)}
                </span>
              </div>

              <span className="hidden sm:inline-block text-xs font-mono text-muted-foreground shrink-0 w-12">
                {durationStr}
              </span>

              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <label
                  htmlFor={`event-${event.id}`}
                  className={`text-sm font-medium truncate cursor-pointer ${
                    isChecked
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {event.title}
                </label>
                {event.notes && (
                  <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <StickyNote className="size-3 shrink-0" />
                    {event.notes}
                  </span>
                )}
              </div>

              <Badge
                variant="outline"
                className={`shrink-0 border ${config.border} ${config.bg} ${config.text} text-xs hidden sm:inline-flex`}
              >
                {config.label}
              </Badge>
              <div
                className={`size-2.5 rounded-full shrink-0 ${config.dot} sm:hidden`}
                title={config.label}
              />

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(event)
                  }}
                  aria-label={`Edit "${event.title}"`}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(event.id)
                  }}
                  aria-label={`Delete "${event.title}"`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
