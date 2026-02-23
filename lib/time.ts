/**
 * Time utilities: all internal times are "minutes from midnight" (0 = 00:00, 1439 = 23:59).
 */

/** Convert minutes from midnight to "HH:MM" string. */
export function minutesToHHMM(minutes: number): string {
  const m = Math.max(0, Math.min(1439, Math.floor(minutes)))
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
}

/** Parse "HH:MM" or "H:MM" to minutes from midnight, or null if invalid. */
export function hhmmToMinutes(hhmm: string): number | null {
  const trimmed = hhmm.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

/** Duration in minutes between start and end (end must be >= start). */
export function getDurationMinutes(startMinutes: number, endMinutes: number): number {
  return Math.max(0, Math.floor(endMinutes) - Math.floor(startMinutes))
}

/** Clamp minutes to a single day (0–1439). */
export function clampMinutesToDay(minutes: number): number {
  const m = Math.floor(minutes)
  if (m < 0) return 0
  if (m > 1439) return 1439
  return m
}

/** Snap minutes to the nearest 15-minute grid (0, 15, 30, 45, ...). */
export function snapTo15Minutes(minutes: number): number {
  const m = Math.floor(minutes)
  return Math.round(m / 15) * 15
}

/** Snap minutes to the nearest 5-minute grid (0, 5, 10, 15, ...). */
export function snapTo5Minutes(minutes: number): number {
  const m = Math.floor(minutes)
  return Math.round(m / 5) * 5
}

/** Drag bounds: 06:00 = 360, 22:00 = 1320. */
export const DRAG_START_MIN = 6 * 60
export const DRAG_END_MIN = 22 * 60

/** Clamp start so the event (start + duration) stays within [DRAG_START_MIN, DRAG_END_MIN]. */
export function clampStartToDragBounds(
  startMinutes: number,
  durationMinutes: number
): number {
  const start = Math.floor(startMinutes)
  const duration = Math.max(0, Math.floor(durationMinutes))
  const minStart = DRAG_START_MIN
  const maxStart = Math.max(minStart, DRAG_END_MIN - duration)
  if (start < minStart) return minStart
  if (start > maxStart) return maxStart
  return start
}

/** Clamp duration so end = start + duration does not exceed DRAG_END_MIN. */
export function clampDurationToDragBounds(
  startMinutes: number,
  durationMinutes: number
): number {
  const start = Math.floor(startMinutes)
  const duration = Math.max(0, Math.floor(durationMinutes))
  const maxDuration = DRAG_END_MIN - start
  return Math.min(duration, maxDuration)
}
