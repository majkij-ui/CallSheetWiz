"use client"

import { useEffect, useRef, useState } from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { Category, EventSubItem, PlannerEvent } from "@/lib/schedule-types"
import { getCategoryStyle } from "@/lib/schedule-types"
import { minutesToHHMM, getDurationMinutes } from "@/lib/time"
import {
  Check,
  ChevronDown,
  Clock,
  GripVertical,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface CallSheetProps {
  events: PlannerEvent[]
  categories: Category[]
  onEdit: (event: PlannerEvent) => void
  onDelete: (eventId: string) => void
  onUpdateEvent: (event: PlannerEvent) => void
}

interface SortableSubItemRowProps {
  eventId: string
  subItem: EventSubItem
  isEditing: boolean
  editDraft: string
  onEditDraftChange: (value: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onToggleCompleted: (checked: boolean) => void
  onRemove: () => void
}

function SortableSubItemRow({
  eventId,
  subItem,
  isEditing,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleCompleted,
  onRemove,
}: SortableSubItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: subItem.id,
    data: { eventId },
    disabled: isEditing,
  })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`call-sheet-subitem-row relative flex items-center gap-2 rounded-sm ${
        isDragging ? "bg-accent opacity-70 shadow-sm" : ""
      }`}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="call-sheet-subitem-delete size-5 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Reorder "${subItem.text}"`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </Button>

      <Checkbox
        checked={subItem.isCompleted}
        onCheckedChange={(checked) => onToggleCompleted(Boolean(checked))}
        aria-label={`Mark "${subItem.text}" complete`}
        className="call-sheet-subitem-checkbox"
      />

      {isEditing ? (
        <>
          <Input
            value={editDraft}
            onChange={(event) => onEditDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                onSaveEdit()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                onCancelEdit()
              }
            }}
            autoFocus
            className="call-sheet-subitem-input h-7 min-w-0 flex-1 bg-background/70 text-xs"
            aria-label={`Edit "${subItem.text}"`}
          />
          <span className="hidden print:inline">{subItem.text}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="call-sheet-subitem-delete size-5 text-muted-foreground hover:text-emerald-400"
            onClick={onSaveEdit}
            aria-label={`Save changes to "${subItem.text}"`}
          >
            <Check className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="call-sheet-subitem-delete size-5 text-muted-foreground hover:text-foreground"
            onClick={onCancelEdit}
            aria-label={`Cancel editing "${subItem.text}"`}
          >
            <X className="size-3" />
          </Button>
        </>
      ) : (
        <>
          <span
            className={`min-w-0 flex-1 text-xs ${
              subItem.isCompleted
                ? "line-through text-muted-foreground"
                : "text-foreground"
            }`}
          >
            {subItem.text}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="call-sheet-subitem-delete size-5 text-muted-foreground hover:text-foreground"
            onClick={onStartEdit}
            aria-label={`Edit "${subItem.text}"`}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="call-sheet-subitem-delete size-5 text-muted-foreground hover:text-foreground"
            onClick={onRemove}
            aria-label={`Remove "${subItem.text}"`}
          >
            <X className="size-3" />
          </Button>
        </>
      )}
    </li>
  )
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
  const [editingSubItem, setEditingSubItem] = useState<{
    eventId: string
    subItemId: string
    draft: string
  } | null>(null)
  const [subItemInputToFocus, setSubItemInputToFocus] = useState<string | null>(
    null,
  )
  const subItemInputRefs = useRef(new Map<string, HTMLInputElement>())
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes)

  useEffect(() => {
    if (!subItemInputToFocus) return
    const input = subItemInputRefs.current.get(subItemInputToFocus)
    if (!input) return
    input.focus()
    setSubItemInputToFocus(null)
  }, [subItemInputToFocus, expandedItems])

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

  const revealSubItemInput = (eventId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.add(eventId)
      return next
    })
    setSubItemInputToFocus(eventId)
  }

  const saveSubItemEdit = (event: PlannerEvent) => {
    if (!editingSubItem || editingSubItem.eventId !== event.id) return
    const nextText = editingSubItem.draft.trim()
    if (!nextText) return

    updateSubItems(
      event,
      (event.subItems ?? []).map((subItem) =>
        subItem.id === editingSubItem.subItemId
          ? { ...subItem, text: nextText }
          : subItem,
      ),
    )
    setEditingSubItem(null)
  }

  const handleSubItemDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const eventId = active.data.current?.eventId
    const overEventId = over.data.current?.eventId
    if (
      typeof eventId !== "string" ||
      eventId !== overEventId
    ) {
      return
    }

    const event = events.find((candidate) => candidate.id === eventId)
    if (!event) return

    const subItems = event.subItems ?? []
    const oldIndex = subItems.findIndex((item) => item.id === active.id)
    const newIndex = subItems.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    updateSubItems(event, arrayMove(subItems, oldIndex, newIndex))
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

      <DndContext
        id="call-sheet-subitems"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSubItemDragEnd}
      >
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

                <div className="flex shrink-0 items-center gap-1">
                  <span className="call-sheet-shots-status hidden lg:inline-flex text-[11px] font-mono text-muted-foreground rounded-full border border-border px-2 py-1">
                    {doneSubItems}/{subItems.length} Shots Done
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="call-sheet-actions size-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      revealSubItemInput(event.id)
                    }}
                    aria-label={`Add shot to "${event.title}"`}
                    title="Add shot"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

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
                      ref={(node) => {
                        if (node) {
                          subItemInputRefs.current.set(event.id, node)
                        } else {
                          subItemInputRefs.current.delete(event.id)
                        }
                      }}
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
                      <SortableContext
                        items={subItems.map((subItem) => subItem.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <ul className="call-sheet-subitem-list mt-2 flex flex-col gap-1.5">
                          {subItems.map((subItem) => {
                            const isEditing =
                              editingSubItem?.eventId === event.id &&
                              editingSubItem.subItemId === subItem.id

                            return (
                              <SortableSubItemRow
                                key={subItem.id}
                                eventId={event.id}
                                subItem={subItem}
                                isEditing={isEditing}
                                editDraft={isEditing ? editingSubItem.draft : ""}
                                onEditDraftChange={(draft) =>
                                  setEditingSubItem((current) =>
                                    current &&
                                    current.eventId === event.id &&
                                    current.subItemId === subItem.id
                                      ? { ...current, draft }
                                      : current,
                                  )
                                }
                                onStartEdit={() =>
                                  setEditingSubItem({
                                    eventId: event.id,
                                    subItemId: subItem.id,
                                    draft: subItem.text,
                                  })
                                }
                                onSaveEdit={() => saveSubItemEdit(event)}
                                onCancelEdit={() => setEditingSubItem(null)}
                                onToggleCompleted={(checked) => {
                                  updateSubItems(
                                    event,
                                    subItems.map((item) =>
                                      item.id === subItem.id
                                        ? { ...item, isCompleted: checked }
                                        : item,
                                    ),
                                  )
                                }}
                                onRemove={() => {
                                  updateSubItems(
                                    event,
                                    subItems.filter(
                                      (item) => item.id !== subItem.id,
                                    ),
                                  )
                                }}
                              />
                            )
                          })}
                        </ul>
                      </SortableContext>
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
      </DndContext>
    </div>
  )
}
