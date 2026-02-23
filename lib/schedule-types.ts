/**
 * Planner data types. Times are stored as minutes from midnight.
 */

export interface Category {
  id: string
  name: string
  /** Key used to look up Tailwind styles (e.g. 'blue', 'violet'). */
  colorKey: string
}

export interface PlannerEvent {
  id: string
  title: string
  /** Start time as minutes from midnight (0–1439). */
  startMinutes: number
  /** End time as minutes from midnight (0–1439). */
  endMinutes: number
  categoryId: string
  notes?: string
}

/** A saved "shooting day" for Local Storage. */
export interface SavedDay {
  id: string
  dayTitle: string
  /** ISO date string when the day was saved. */
  date: string
  events: PlannerEvent[]
  categories: Category[]
}

/** Style set for a color key (Tailwind classes). */
export interface CategoryStyle {
  label: string
  color: string
  bg: string
  border: string
  text: string
  dot: string
}

const COLOR_STYLES: Record<string, CategoryStyle> = {
  blue: {
    label: "",
    color: "bg-blue-500",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
  violet: {
    label: "",
    color: "bg-violet-500",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-400",
    dot: "bg-violet-400",
  },
  emerald: {
    label: "",
    color: "bg-emerald-500",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  orange: {
    label: "",
    color: "bg-orange-500",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
  amber: {
    label: "",
    color: "bg-amber-500",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  rose: {
    label: "",
    color: "bg-rose-500",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
}

/** Get style for a category (uses category name as label override). */
export function getCategoryStyle(category: Category): CategoryStyle {
  const base = COLOR_STYLES[category.colorKey] ?? COLOR_STYLES.blue
  return { ...base, label: category.name }
}

/** Get style by color key only (for legend when you don't have full category). */
export function getStyleByColorKey(colorKey: string): CategoryStyle {
  const base = COLOR_STYLES[colorKey] ?? COLOR_STYLES.blue
  return { ...base, label: colorKey }
}

export const DEFAULT_COLOR_KEYS = Object.keys(COLOR_STYLES)
