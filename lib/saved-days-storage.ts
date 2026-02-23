import type { SavedDay } from "./schedule-types"

export const SAVED_DAYS_STORAGE_KEY = "callsheetwiz-saved-days"

/** Read saved days from Local Storage. Call only on the client after mount. */
export function getSavedDays(): SavedDay[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SAVED_DAYS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Write saved days to Local Storage. Call only on the client after mount. */
export function setSavedDays(days: SavedDay[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SAVED_DAYS_STORAGE_KEY, JSON.stringify(days))
  } catch {
    // ignore
  }
}
