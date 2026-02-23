"use client"

import { useRef, useEffect, useState } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import type { Category, PlannerEvent } from "@/lib/schedule-types"
import { getCategoryStyle } from "@/lib/schedule-types"
import { minutesToHHMM, getDurationMinutes } from "@/lib/time"

const TIMELINE_START_MIN = 6 * 60   // 06:00
const TIMELINE_END_MIN = 20 * 60   // 20:00
const TIMELINE_SPAN_MIN = TIMELINE_END_MIN - TIMELINE_START_MIN  // 840
const HOUR_WIDTH = 120
const TOTAL_HOURS = 14
const ROW_HEIGHT = 44
const ROW_GAP = 6

interface TimelineProps {
  events: PlannerEvent[]
  categories: Category[]
}

interface TimelineRow {
  events: PlannerEvent[]
}

function assignRows(events: PlannerEvent[]): TimelineRow[] {
  const sorted = [...events].sort(
    (a, b) => a.startMinutes - b.startMinutes
  )

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

    if (!placed) {
      rows.push({ events: [event] })
    }
  }

  return rows
}

function CurrentTimeMarker() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  if (nowMinutes < TIMELINE_START_MIN || nowMinutes >= TIMELINE_END_MIN) return null

  const offsetMinutes = nowMinutes - TIMELINE_START_MIN
  const left = (offsetMinutes / 60) * HOUR_WIDTH

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${left}px` }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -translate-x-1/2 -top-1 absolute" />
      <div className="w-px h-full bg-red-500/60" />
    </div>
  )
}

export function VisualTimeline({ events, categories }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = assignRows(events)
  const totalContentHeight = rows.length * (ROW_HEIGHT + ROW_GAP) + ROW_GAP
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

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
                <div className={`size-2 rounded-full ${style.dot}`} />
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {style.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="w-full">
          <div
            className="relative"
            style={{
              width: `${TOTAL_HOURS * HOUR_WIDTH}px`,
              minHeight: `${totalContentHeight + 36}px`,
            }}
            ref={scrollRef}
          >
            {/* Hour grid lines + labels */}
            <div className="flex border-b border-border">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex-shrink-0 border-r border-border/50 px-2 py-2"
                  style={{ width: `${HOUR_WIDTH}px` }}
                >
                  <span className="text-xs font-mono text-muted-foreground">
                    {minutesToHHMM(hour * 60)}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid background lines */}
            <div className="absolute top-9 left-0 right-0 bottom-0 pointer-events-none">
              {hours.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0 border-r border-border/30"
                  style={{ left: `${i * HOUR_WIDTH}px` }}
                />
              ))}
            </div>

            {/* Current time marker */}
            <div className="absolute top-9 left-0 right-0 bottom-0">
              <CurrentTimeMarker />
            </div>

            {/* Event blocks */}
            <div
              className="relative"
              style={{ padding: `${ROW_GAP}px 0` }}
            >
              {rows.map((row, rowIndex) =>
                row.events.map((event) => {
                  const offsetMin = event.startMinutes - TIMELINE_START_MIN
                  const durationMin = getDurationMinutes(event.startMinutes, event.endMinutes)
                  const left = (offsetMin / 60) * HOUR_WIDTH
                  const width = (durationMin / 60) * HOUR_WIDTH
                  const top = rowIndex * (ROW_HEIGHT + ROW_GAP)
                  const category = categoryMap.get(event.categoryId)
                  const config = category ? getCategoryStyle(category) : { border: "border-border", bg: "bg-muted/50", text: "text-muted-foreground" }

                  return (
                    <div
                      key={event.id}
                      className={`absolute rounded-md border ${config.border} ${config.bg} flex items-center px-3 overflow-hidden cursor-default transition-opacity hover:opacity-90 group`}
                      style={{
                        left: `${left}px`,
                        width: `${Math.max(width - 2, 30)}px`,
                        top: `${top}px`,
                        height: `${ROW_HEIGHT}px`,
                      }}
                      title={`${event.title}\n${minutesToHHMM(event.startMinutes)} - ${minutesToHHMM(event.endMinutes)}${event.notes ? `\n${event.notes}` : ""}`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-xs font-medium ${config.text} truncate`}
                        >
                          {event.title}
                        </span>
                        {width > 100 && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {minutesToHHMM(event.startMinutes)}
                            {" - "}
                            {minutesToHHMM(event.endMinutes)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}
