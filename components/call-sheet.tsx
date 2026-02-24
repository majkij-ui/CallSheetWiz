"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { Category, PlannerEvent } from "@/lib/schedule-types"
import { getCategoryStyle } from "@/lib/schedule-types"
import { minutesToHHMM, getDurationMinutes } from "@/lib/time"
import { ChevronDown, Clock, Pencil, StickyNote, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CallSheetProps {
  events: PlannerEvent[]
  categories: Category[]
  onEdit: (event: PlannerEvent) => void
  onDelete: (eventId: string) => void
  onUpdateEvent: (event: PlannerEvent) => void
}

export function CallSheet({
  events,
  categories,
  onEdit,
  onDelete,
  onUpdateEvent,
}: CallSheetProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [subItemDrafts, setSubItemDrafts] = useState<Record<string, string>>({})
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

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const setSubItemDraft = (eventId: string, value: string) => {
    setSubItemDrafts((prev) => ({ ...prev, [eventId]: value }))
  }

  const updateSubItems = (event: PlannerEvent, subItems: NonNullable<PlannerEvent["subItems"]>) => {
    onUpdateEvent({
      ...event,
      subItems,
    })
  }

  const addSubItem = (event: PlannerEvent) => {
    const draft = (subItemDrafts[event.id] ?? "").trim()
    if (!draft) return

    const currentSubItems = event.subItems ?? []
    updateSubItems(event, [
      ...currentSubItems,
      {
        id: crypto.randomUUID(),
        text: draft,
        isCompleted: false,
      },
    ])
    setSubItemDraft(event.id, "")
  }

  const completedCount = checkedItems.size
  const totalCount = events.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="call-sheet-meta flex items-center justify-between">
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

      <div className="call-sheet-table rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        <div className="call-sheet-print-columns">
          <span>Time</span>
          <span>Dur</span>
          <span>Activity</span>
          <span>Done</span>
        </div>
        {sorted.map((event) => {
          const category = categoryMap.get(event.categoryId)
          const config = category
            ? getCategoryStyle(category)
            : {
                label: "Uncategorized",
                borderColor: "rgba(148, 163, 184, 0.35)",
                bgColor: "rgba(148, 163, 184, 0.12)",
                textColor: "#94a3b8",
                dotColor: "#94a3b8",
              }
          const isChecked = checkedItems.has(event.id)
          const isExpanded = expandedItems.has(event.id)
          const subItems = event.subItems ?? []
          const doneSubItems = subItems.filter((subItem) => subItem.isCompleted).length
          const duration = getDurationMinutes(event.startMinutes, event.endMinutes)
          const durationStr =
            duration >= 60
              ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}m` : ""}`
              : `${duration}m`

          return (
            <div key={event.id} className="call-sheet-row group/event">
              <div
                className={`group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50 ${
                  isChecked ? "opacity-50" : ""
                }`}
              >
                <Checkbox
                  id={`event-${event.id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleItem(event.id)}
                  className="call-sheet-event-checkbox shrink-0"
                  aria-label={`Mark "${event.title}" as complete`}
                />

                <div className="call-sheet-time-col flex items-center gap-2 shrink-0 w-32 sm:w-40">
                  <Clock className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono text-foreground">
                    {minutesToHHMM(event.startMinutes)}
                    {" - "}
                    {minutesToHHMM(event.endMinutes)}
                  </span>
                </div>

                <span className="call-sheet-duration-col hidden sm:inline-block text-xs font-mono text-muted-foreground shrink-0 w-12">
                  {durationStr}
                </span>

                <div className="call-sheet-activity-col flex flex-col gap-0.5 min-w-0 flex-1">
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

                <span className="call-sheet-shots-status hidden lg:inline-flex text-[11px] font-mono text-muted-foreground rounded-full border border-border px-2 py-1 shrink-0">
                  {doneSubItems}/{subItems.length} Shots Done
                </span>

                <Badge
                  variant="outline"
                  className="call-sheet-category-badge shrink-0 border text-xs hidden sm:inline-flex"
                  style={{
                    borderColor: config.borderColor,
                    backgroundColor: config.bgColor,
                    color: config.textColor,
                  }}
                >
                  {config.label}
                </Badge>
                <div
                  className="call-sheet-category-dot size-2.5 rounded-full shrink-0 sm:hidden"
                  style={{ backgroundColor: config.dotColor }}
                  title={config.label}
                />

                <div className="call-sheet-actions flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="call-sheet-toggle-button size-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(event.id)
                    }}
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} "${event.title}" sub-items`}
                  >
                    <ChevronDown
                      className={`size-3.5 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within/event:opacity-100 transition-opacity">
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
              </div>

              <div
                className={`call-sheet-subitems-panel grid transition-all duration-300 ease-out ${
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="call-sheet-subitems-content overflow-hidden">
                  <div className="ml-8 sm:ml-12 mr-4 mb-3 rounded-md border border-border/80 bg-accent/20 p-3">
                    <Input
                      value={subItemDrafts[event.id] ?? ""}
                      onChange={(e) => setSubItemDraft(event.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return
                        e.preventDefault()
                        addSubItem(event)
                      }}
                      placeholder="Add sub-item and press Enter..."
                      className="call-sheet-subitem-input h-8 text-xs bg-background/70 border-border/70"
                      aria-label={`Add sub-item for "${event.title}"`}
                    />

                    {subItems.length > 0 ? (
                      <ul className="call-sheet-subitem-list mt-2 flex flex-col gap-1.5">
                        {subItems.map((subItem) => (
                          <li key={subItem.id} className="call-sheet-subitem-row flex items-center gap-2">
                            <Checkbox
                              checked={subItem.isCompleted}
                              onCheckedChange={(checked) => {
                                updateSubItems(
                                  event,
                                  subItems.map((item) =>
                                    item.id === subItem.id
                                      ? { ...item, isCompleted: Boolean(checked) }
                                      : item
                                  )
                                )
                              }}
                              aria-label={`Mark "${subItem.text}" complete`}
                              className="call-sheet-subitem-checkbox"
                            />
                            <span
                              className={`text-xs flex-1 min-w-0 ${
                                subItem.isCompleted
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {subItem.text}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="call-sheet-subitem-delete size-5 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                updateSubItems(
                                  event,
                                  subItems.filter((item) => item.id !== subItem.id)
                                )
                              }}
                              aria-label={`Remove "${subItem.text}"`}
                            >
                              <X className="size-3" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="call-sheet-no-subitems mt-2 text-xs text-muted-foreground">
                        No sub-items yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
