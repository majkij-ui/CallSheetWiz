/**
 * Event editing logic: duration vs start/end, and "follow previous".
 * All times are minutes from midnight.
 */

import type { PlannerEvent } from "./schedule-types"
import { getDurationMinutes, clampMinutesToDay } from "./time"

/** Set start and end; duration is derived. */
export function setEventStartEnd(
  event: PlannerEvent,
  startMinutes: number,
  endMinutes: number
): PlannerEvent {
  const start = clampMinutesToDay(startMinutes)
  const end = Math.max(start, clampMinutesToDay(endMinutes))
  return { ...event, startMinutes: start, endMinutes: end }
}

/** Set duration; end is recalculated from start. */
export function setEventDuration(event: PlannerEvent, durationMinutes: number): PlannerEvent {
  const duration = Math.max(0, Math.floor(durationMinutes))
  const end = clampMinutesToDay(event.startMinutes + duration)
  return { ...event, endMinutes: end }
}

/** Set start; end is recalculated to preserve duration. */
export function setEventStart(event: PlannerEvent, startMinutes: number): PlannerEvent {
  const duration = getDurationMinutes(event.startMinutes, event.endMinutes)
  const start = clampMinutesToDay(startMinutes)
  const end = clampMinutesToDay(start + duration)
  return { ...event, startMinutes: start, endMinutes: end }
}

/** Set end; start is recalculated to preserve duration. */
export function setEventEnd(event: PlannerEvent, endMinutes: number): PlannerEvent {
  const duration = getDurationMinutes(event.startMinutes, event.endMinutes)
  const end = clampMinutesToDay(endMinutes)
  const start = clampMinutesToDay(end - duration)
  return { ...event, startMinutes: start, endMinutes: end }
}

/**
 * "Follow previous": set this event's start to the previous event's end,
 * then set end = start + current duration.
 */
export function followPreviousEvent(
  event: PlannerEvent,
  previousEvent: PlannerEvent | null
): PlannerEvent {
  if (!previousEvent) return event
  const duration = getDurationMinutes(event.startMinutes, event.endMinutes)
  const start = previousEvent.endMinutes
  const end = clampMinutesToDay(start + duration)
  return { ...event, startMinutes: start, endMinutes: end }
}

/** Build event from start + end (HH:MM or minutes). */
export function createEventFromStartEnd(
  partial: Omit<PlannerEvent, "startMinutes" | "endMinutes">,
  startMinutes: number,
  endMinutes: number
): PlannerEvent {
  const start = clampMinutesToDay(startMinutes)
  const end = Math.max(start, clampMinutesToDay(endMinutes))
  return { ...partial, startMinutes: start, endMinutes: end }
}

/** Build event from start + duration. */
export function createEventFromStartDuration(
  partial: Omit<PlannerEvent, "startMinutes" | "endMinutes">,
  startMinutes: number,
  durationMinutes: number
): PlannerEvent {
  const start = clampMinutesToDay(startMinutes)
  const duration = Math.max(0, Math.floor(durationMinutes))
  const end = clampMinutesToDay(start + duration)
  return { ...partial, startMinutes: start, endMinutes: end }
}
