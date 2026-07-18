"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  DragOverlay,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis, createSnapModifier } from "@dnd-kit/modifiers"
import type { Category, PlannerEvent } from "@/lib/schedule-types"
import { getCategoryStyle } from "@/lib/schedule-types"
import {
  minutesToHHMM,
  getDurationMinutes,
  snapTo5Minutes,
  clampStartToDragBounds,
  clampDurationToDragBounds,
} from "@/lib/time"
import { cn } from "@/lib/utils"

const TIMELINE_START_MIN = 6 * 60
const TIMELINE_END_MIN = 22 * 60
/** 16-hour day in minutes (06:00–22:00). */
const DAY_SPAN_MIN = 960
const ROW_HEIGHT = 44
const ROW_GAP = 6
const MIN_DURATION_MIN = 5
const MIN_TIMELINE_WIDTH_PX = 2000
const MIN_EVENT_WIDTH_PX = 8
/** Fallback width when container not yet measured. */
const FALLBACK_TIMELINE_WIDTH = MIN_TIMELINE_WIDTH_PX

function pxToStartMinutes(leftPx: number, timelineWidth: number): number {
  if (timelineWidth <= 0) timelineWidth = FALLBACK_TIMELINE_WIDTH
  const offsetMin = (leftPx / timelineWidth) * DAY_SPAN_MIN
  return TIMELINE_START_MIN + offsetMin
}

function startMinutesToPx(startMinutes: number, timelineWidth: number): number {
  if (timelineWidth <= 0) timelineWidth = FALLBACK_TIMELINE_WIDTH
  const offsetMin = startMinutes - TIMELINE_START_MIN
  return (offsetMin / DAY_SPAN_MIN) * timelineWidth
}

/** Pixels that represent 5 minutes for snap-to-grid. Responsive to container width. */
function getSnapSizePx(containerWidth: number): number {
  if (containerWidth <= 0) return (FALLBACK_TIMELINE_WIDTH / DAY_SPAN_MIN) * 5
  return (containerWidth / DAY_SPAN_MIN) * 5
}

interface TimelineProps {
  events: PlannerEvent[]
  categories: Category[]
  onEventChange?: (eventId: string, updates: { startMinutes?: number; endMinutes?: number }) => void
}

interface TimelineRow {
  events: PlannerEvent[]
}

function assignRows(events: PlannerEvent[]): TimelineRow[] {
  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes)
  const rows: TimelineRow[] = []
  for (const event of sorted) {
    let placed = false
    for (const row of rows) {
      const lastEvent = row.events[row.events.length - 1]
      if (event.startMinutes >= lastEvent.endMinutes) {
        row.events.push(event)
        placed = true
        break
      }
    }
    if (!placed) rows.push({ events: [event] })
  }
  return rows
}

const TOTAL_HOURS = 16 // 06:00 to 22:00

function CurrentTimeMarker({ timelineWidth }: { timelineWidth: number }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  if (nowMinutes < TIMELINE_START_MIN || nowMinutes >= TIMELINE_END_MIN) return null
  const offsetMinutes = nowMinutes - TIMELINE_START_MIN
  const left = (offsetMinutes / DAY_SPAN_MIN) * (timelineWidth || FALLBACK_TIMELINE_WIDTH)
  return (
    <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${left}px` }}>
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -translate-x-1/2 -top-1 absolute" />
      <div className="w-px h-full bg-red-500/60" />
    </div>
  )
}

interface EventBlockProps {
  event: PlannerEvent
  category: ReturnType<typeof getCategoryStyle> | null
  rowIndex: number
  leftPx: number
  widthPx: number
  timelineWidth: number
  onEventChange?: (eventId: string, updates: { startMinutes?: number; endMinutes?: number }) => void
  isDragging?: boolean
}

function EventBlock({
  event,
  category,
  rowIndex,
  leftPx,
  widthPx,
  timelineWidth,
  onEventChange,
  isDragging,
}: EventBlockProps) {
  const config = category ?? {
    borderColor: "rgba(148, 163, 184, 0.35)",
    bgColor: "rgba(148, 163, 184, 0.12)",
    textColor: "#94a3b8",
  }
  const durationMin = getDurationMinutes(event.startMinutes, event.endMinutes)
  const top = rowIndex * (ROW_HEIGHT + ROW_GAP)
  const eventWidthPx = Math.max(widthPx - 2, MIN_EVENT_WIDTH_PX)
  const showTitle = eventWidthPx >= 56
  const showTime = eventWidthPx >= 120

  const { attributes, listeners, setNodeRef, transform, isDragging: dndIsDragging } = useDraggable({
    id: event.id,
    data: { event, rowIndex, leftPx, durationMin },
  })

  const resizeRef = useRef<HTMLDivElement>(null)
  const [resizeState, setResizeState] = useState<{
    startPageX: number
    startWidthPx: number
    startMinutes: number
  } | null>(null)

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (!onEventChange) return
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      setResizeState({
        startPageX: e.clientX,
        startWidthPx: widthPx,
        startMinutes: event.startMinutes,
      })
    },
    [onEventChange, widthPx, event.startMinutes]
  )

  useEffect(() => {
    if (!resizeState || !onEventChange || timelineWidth <= 0) return
    const onMove = (e: PointerEvent) => {
      const deltaPx = e.clientX - resizeState.startPageX
      let newWidthPx = resizeState.startWidthPx + deltaPx
      const minWidthPx = (MIN_DURATION_MIN / DAY_SPAN_MIN) * timelineWidth
      if (newWidthPx < minWidthPx) newWidthPx = minWidthPx
      const newDurationMin = (newWidthPx / timelineWidth) * DAY_SPAN_MIN
      const clampedDuration = clampDurationToDragBounds(resizeState.startMinutes, newDurationMin)
      const newEnd = resizeState.startMinutes + clampedDuration
      onEventChange(event.id, { endMinutes: newEnd })
    }
    const onUp = () => {
      setResizeState(null)
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onUp)
    }
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    document.addEventListener("pointercancel", onUp)
    return () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onUp)
    }
  }, [resizeState, onEventChange, event.id, timelineWidth])

  const isResizingLocal = resizeState !== null
  const dragging = dndIsDragging || isDragging
  const style: React.CSSProperties = {
    left: `${leftPx}px`,
    width: `${eventWidthPx}px`,
    top: `${top}px`,
    height: `${ROW_HEIGHT}px`,
    opacity: dragging || isResizingLocal ? 0.6 : 1,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute rounded-md border flex items-center px-2 overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none",
        (dragging || isResizingLocal) && "opacity-60 z-30"
      )}
      style={{
        ...style,
        borderColor: config.borderColor,
        backgroundColor: config.bgColor,
      }}
      title={`${event.title}\n${minutesToHHMM(event.startMinutes)} - ${minutesToHHMM(event.endMinutes)}${event.notes ? `\n${event.notes}` : ""}`}
      {...listeners}
      {...attributes}
    >
      {/* Floating time during resize */}
      {isResizingLocal && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 text-xs font-mono text-foreground bg-popover border border-border rounded px-2 py-1 shadow-md whitespace-nowrap pointer-events-none">
          {minutesToHHMM(event.startMinutes)} – {minutesToHHMM(event.endMinutes)}
        </div>
      )}
      <div className="flex flex-col min-w-0 flex-1 pointer-events-none overflow-hidden">
        {showTitle && (
          <span className="text-xs font-medium truncate" style={{ color: config.textColor }}>
            {event.title}
          </span>
        )}
        {showTime && (
          <span className="text-[10px] text-muted-foreground truncate">
            {minutesToHHMM(event.startMinutes)} - {minutesToHHMM(event.endMinutes)}
          </span>
        )}
      </div>
      {onEventChange && (
        <div
          ref={resizeRef}
          role="separator"
          aria-label="Resize event"
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize shrink-0 touch-none flex items-center justify-center group"
          onPointerDown={handleResizeStart}
        >
          <span className="w-0.5 h-6 rounded-full bg-border/80 group-hover:bg-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  )
}

export function VisualTimeline({ events, categories, onEventChange }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1.5)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = entry.contentRect.width
      // Ignore zero width (element hidden, e.g. print media) and sub-pixel
      // jitter, so a media-switch can't feed a render loop.
      if (width <= 0) return
      setContainerWidth((prev) => (Math.abs(prev - width) < 1 ? prev : width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const baseWidth = Math.max(containerWidth, MIN_TIMELINE_WIDTH_PX)
  const timelineWidth = Math.max(baseWidth * zoomLevel, FALLBACK_TIMELINE_WIDTH)
  const snapSizePx = getSnapSizePx(timelineWidth)
  const snapModifier = createSnapModifier(snapSizePx)

  const rows = assignRows(events)
  const totalContentHeight = rows.length * (ROW_HEIGHT + ROW_GAP) + ROW_GAP
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragDeltaX, setDragDeltaX] = useState(0)
  const [dragInitialLeftPx, setDragInitialLeftPx] = useState(0)
  const [dragEvent, setDragEvent] = useState<PlannerEvent | null>(null)
  const [dragRowIndex, setDragRowIndex] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } })
  )

  const activeEvent = activeId ? events.find((e) => e.id === activeId) ?? dragEvent : null
  const activeCategory = activeEvent ? categoryMap.get(activeEvent.categoryId) : null
  const activeStyle = activeCategory ? getCategoryStyle(activeCategory) : null

  const currentLeftPx = dragInitialLeftPx + dragDeltaX
  const previewStartMinutes = pxToStartMinutes(currentLeftPx, timelineWidth)
  const snappedStart = snapTo5Minutes(previewStartMinutes)
  const durationMin = activeEvent ? getDurationMinutes(activeEvent.startMinutes, activeEvent.endMinutes) : 0
  const clampedStart = activeEvent
    ? clampStartToDragBounds(snappedStart, durationMin)
    : snappedStart
  const ghostLeftPx = startMinutesToPx(clampedStart, timelineWidth)
  const hourWidthPx = timelineWidth / TOTAL_HOURS

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    const data = event.active.data.current as { event: PlannerEvent; leftPx: number; durationMin: number; rowIndex: number } | undefined
    if (data) {
      setActiveId(id)
      setDragDeltaX(0)
      setDragInitialLeftPx(data.leftPx)
      setDragEvent(data.event)
      setDragRowIndex(data.rowIndex ?? 0)
    }
  }, [])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    setDragDeltaX(event.delta.x)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const id = String(event.active.id)
      const data = event.active.data.current as { leftPx: number; durationMin: number } | undefined
      const initialLeftPx = data?.leftPx ?? 0
      const finalLeftPx = initialLeftPx + event.delta.x
      const rawStart = pxToStartMinutes(finalLeftPx, timelineWidth)
      const snapped = snapTo5Minutes(rawStart)
      const durationMin = data?.durationMin ?? 0
      const newStartMinutes = clampStartToDragBounds(snapped, durationMin)
      setActiveId(null)
      setDragDeltaX(0)
      setDragEvent(null)
      if (onEventChange) {
        onEventChange(id, { startMinutes: newStartMinutes })
      }
    },
    [onEventChange, timelineWidth]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setDragDeltaX(0)
    setDragEvent(null)
  }, [])

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => 6 + i)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Timeline
        </h2>
        <div className="flex items-center gap-4">
          {categories.map((cat) => {
            const style = getCategoryStyle(cat)
            return (
              <div key={cat.id} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: style.dotColor }} />
                <span className="text-xs text-muted-foreground hidden sm:inline">{style.label}</span>
              </div>
            )
          })}
          <div className="flex items-center gap-2 pl-2 border-l border-border/70">
            <label htmlFor="timeline-zoom" className="text-xs text-muted-foreground">
              Zoom
            </label>
            <input
              id="timeline-zoom"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-24 accent-[#ff6700]"
            />
            <span className="w-10 text-right text-xs font-mono text-muted-foreground">
              {zoomLevel.toFixed(1)}x
            </span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="rounded-lg border border-border bg-card overflow-hidden w-full"
      >
        <ScrollArea className="w-full">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToHorizontalAxis, snapModifier]}
          >
            <div
              className="relative"
              style={{
                width: `${timelineWidth}px`,
                minWidth: `${MIN_TIMELINE_WIDTH_PX}px`,
                minHeight: `${totalContentHeight + 36}px`,
              }}
              ref={scrollRef}
            >
              <div className="flex border-b border-border">
                {hours.map((hour, i) => (
                  <div
                    key={hour}
                    className="flex-shrink-0 border-r border-border/50 px-2 py-2"
                    style={{ width: `${i < TOTAL_HOURS ? hourWidthPx : 0}px` }}
                  >
                    <span className="text-xs font-mono text-muted-foreground">
                      {minutesToHHMM(hour * 60)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="absolute top-9 left-0 right-0 bottom-0 pointer-events-none">
                {hours.map((hour, i) => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 border-r border-border/30"
                    style={{ left: `${i * hourWidthPx}px` }}
                  />
                ))}
              </div>

              <div className="absolute top-9 left-0 right-0 bottom-0">
                <CurrentTimeMarker timelineWidth={timelineWidth} />
              </div>

              <div className="relative" style={{ padding: `${ROW_GAP}px 0` }}>
                {rows.map((row, rowIndex) =>
                  row.events.map((event) => {
                    const offsetMin = event.startMinutes - TIMELINE_START_MIN
                    const durationMin = getDurationMinutes(event.startMinutes, event.endMinutes)
                    const left = (offsetMin / DAY_SPAN_MIN) * timelineWidth
                    const width = (durationMin / DAY_SPAN_MIN) * timelineWidth
                    const top = rowIndex * (ROW_HEIGHT + ROW_GAP)
                    const category = categoryMap.get(event.categoryId)
                    const config = category ? getCategoryStyle(category) : null
                    const isActive = activeId === event.id
                    return (
                      <EventBlock
                        key={event.id}
                        event={event}
                        category={config}
                        rowIndex={rowIndex}
                        leftPx={left}
                        widthPx={width}
                        timelineWidth={timelineWidth}
                        onEventChange={onEventChange}
                        isDragging={isActive}
                      />
                    )
                  })
                )}

                {/* Ghost: where the block will land when dragging (snapped to 5-min grid) */}
                {activeId && activeEvent && (
                  <div
                    className="absolute rounded-md border-2 border-dashed border-primary/50 bg-primary/10 z-10 pointer-events-none"
                    style={{
                      left: `${ghostLeftPx}px`,
                      width: `${Math.max((durationMin / DAY_SPAN_MIN) * timelineWidth - 2, MIN_EVENT_WIDTH_PX)}px`,
                      top: `${dragRowIndex * (ROW_HEIGHT + ROW_GAP)}px`,
                      height: `${ROW_HEIGHT}px`,
                    }}
                  />
                )}
              </div>
            </div>

            <DragOverlay dropAnimation={null}>
              {activeEvent && activeStyle ? (
                <div className="relative">
                  {/* Floating time above the block (snapped to 5-min grid) */}
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 text-xs font-mono text-foreground bg-popover border border-border rounded px-2 py-1 shadow-md whitespace-nowrap"
                  >
                    {minutesToHHMM(clampedStart)} – {minutesToHHMM(clampedStart + durationMin)}
                  </div>
                  <div
                    className={cn(
                      "rounded-md border flex items-center px-3 overflow-hidden opacity-80 shadow-lg cursor-grabbing",
                    )}
                    style={{
                      width: `${Math.max((durationMin / DAY_SPAN_MIN) * timelineWidth - 2, MIN_EVENT_WIDTH_PX)}px`,
                      height: `${ROW_HEIGHT}px`,
                      borderColor: activeStyle.borderColor,
                      backgroundColor: activeStyle.bgColor,
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate" style={{ color: activeStyle.textColor }}>
                        {activeEvent.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {minutesToHHMM(clampedStart)} – {minutesToHHMM(clampedStart + durationMin)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}
