import type { SavedDay } from "./schedule-types"

export const SAVED_DAYS_STORAGE_KEY = "callsheetwiz-saved-days"

/** Read saved days from Local Storage. Call only on the client after mount. */
export function getSavedDays(): SavedDay[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SAVED_DAYS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap(normalizeSavedDay)
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

/**
 * Parse and validate JSON file content into SavedDay[].
 * Accepts either one exported day or an array of days.
 * Returns null if the file does not contain valid schedule data.
 */
export function parseSavedDaysFile(content: string): SavedDay[] | null {
  try {
    const parsed = JSON.parse(content) as unknown
    const values = Array.isArray(parsed) ? parsed : [parsed]
    const days = values.flatMap(normalizeSavedDay)
    return days.length > 0
      ? days
      : Array.isArray(parsed) && parsed.length === 0
        ? []
        : null
  } catch {
    return null
  }
}

function normalizeSavedDay(value: unknown): SavedDay[] {
  if (!value || typeof value !== "object") return []

  const maybeDay = value as Partial<SavedDay> & Record<string, unknown>
  if (
    typeof maybeDay.id !== "string" ||
    typeof maybeDay.dayTitle !== "string" ||
    typeof maybeDay.date !== "string" ||
    !Array.isArray(maybeDay.events) ||
    !Array.isArray(maybeDay.categories)
  ) {
    return []
  }

  const events = maybeDay.events
    .filter((event): event is SavedDay["events"][number] & Record<string, unknown> => {
      if (!event || typeof event !== "object") return false
      const e = event as Partial<SavedDay["events"][number]>
      return (
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        typeof e.startMinutes === "number" &&
        typeof e.endMinutes === "number" &&
        typeof e.categoryId === "string"
      )
    })
    .map((event) => {
      const rawSubItems = Array.isArray(event.subItems) ? event.subItems : []
      const subItems = rawSubItems
        .filter((subItem): subItem is { id: string; text: string; isCompleted: boolean } => {
          if (!subItem || typeof subItem !== "object") return false
          const s = subItem as Partial<{ id: string; text: string; isCompleted: boolean }>
          return (
            typeof s.id === "string" &&
            typeof s.text === "string" &&
            typeof s.isCompleted === "boolean"
          )
        })
        .map((subItem) => ({
          id: subItem.id,
          text: subItem.text,
          isCompleted: subItem.isCompleted,
        }))

      return {
        id: event.id,
        title: event.title,
        startMinutes: event.startMinutes,
        endMinutes: event.endMinutes,
        categoryId: event.categoryId,
        notes: typeof event.notes === "string" ? event.notes : undefined,
        subItems,
      }
    })

  const categories = maybeDay.categories
    .filter((category): category is SavedDay["categories"][number] => {
      if (!category || typeof category !== "object") return false
      const c = category as Partial<SavedDay["categories"][number]>
      return (
        typeof c.id === "string" &&
        typeof c.label === "string" &&
        typeof c.color === "string"
      )
    })
    .map((category) => ({
      id: category.id,
      label: category.label,
      color: category.color,
    }))

  return [
    {
      id: maybeDay.id,
      dayTitle: maybeDay.dayTitle,
      date: maybeDay.date,
      events,
      categories,
    },
  ]
}
