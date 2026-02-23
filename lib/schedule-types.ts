/**
 * Planner data types. Times are stored as minutes from midnight.
 */

export interface Category {
  id: string
  label: string
  /** Hex color used to style tag chips and event blocks. */
  color: string
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
  subItems?: EventSubItem[]
}

export interface EventSubItem {
  id: string
  text: string
  isCompleted: boolean
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
  bgColor: string
  borderColor: string
  textColor: string
  dotColor: string
}

const LEGACY_COLOR_KEY_MAP: Record<string, string> = {
  blue: "#0078ff",
  violet: "#9d00ff",
  emerald: "#39ff14",
  orange: "#ff6700",
  amber: "#f3ff00",
  rose: "#ff003c",
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  const value = parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(148, 163, 184, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/** Get UI style values for a category based on its hex color. */
export function getCategoryStyle(category: Category): CategoryStyle {
  const legacyColorKey = (category as Category & { colorKey?: string }).colorKey
  const legacyName = (category as Category & { name?: string }).name
  const baseColor = category.color || (legacyColorKey ? LEGACY_COLOR_KEY_MAP[legacyColorKey] : "") || "#94a3b8"
  return {
    label: category.label || legacyName || "Uncategorized",
    color: baseColor,
    bgColor: rgba(baseColor, 0.16),
    borderColor: rgba(baseColor, 0.45),
    textColor: baseColor,
    dotColor: baseColor,
  }
}

export const NEON_TAG_COLORS = [
  "#00f3ff",
  "#39ff14",
  "#ff00ff",
  "#ff6700",
  "#ff003c",
  "#9d00ff",
  "#f3ff00",
  "#0078ff",
] as const
