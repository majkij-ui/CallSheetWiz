import type { Category, PlannerEvent } from "./schedule-types"

export type Department =
  | "camera-grip"
  | "art"
  | "talent-hmu"
  | "meals-breaks"

export interface ScheduleEvent {
  id: string
  title: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  department: Department
  notes?: string
}

export const departmentConfig: Record<
  Department,
  { label: string; color: string; bg: string; border: string; text: string; dot: string }
> = {
  "camera-grip": {
    label: "Camera & Grip",
    color: "bg-blue-500",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
  art: {
    label: "Art Department",
    color: "bg-violet-500",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-400",
    dot: "bg-violet-400",
  },
  "talent-hmu": {
    label: "Talent & Hair/Makeup",
    color: "bg-emerald-500",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  "meals-breaks": {
    label: "Meals & Breaks",
    color: "bg-orange-500",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
}

export const scheduleEvents: ScheduleEvent[] = [
  {
    id: "1",
    title: "Crew Call & Safety Briefing",
    startHour: 6,
    startMinute: 0,
    endHour: 6,
    endMinute: 30,
    department: "camera-grip",
    notes: "All departments report to base camp",
  },
  {
    id: "2",
    title: "Hair & Makeup - Lead Talent",
    startHour: 6,
    startMinute: 30,
    endHour: 8,
    endMinute: 0,
    department: "talent-hmu",
    notes: "Talent trailer - looks A & B",
  },
  {
    id: "3",
    title: "Set Dressing - Scene 1",
    startHour: 6,
    startMinute: 30,
    endHour: 8,
    endMinute: 0,
    department: "art",
    notes: "Kitchen set - hero product placement",
  },
  {
    id: "4",
    title: "Lighting Setup - Scene 1",
    startHour: 7,
    startMinute: 0,
    endHour: 8,
    endMinute: 30,
    department: "camera-grip",
    notes: "Key + fill, 2x HMI through windows",
  },
  {
    id: "5",
    title: "Breakfast",
    startHour: 7,
    startMinute: 30,
    endHour: 8,
    endMinute: 0,
    department: "meals-breaks",
    notes: "Catering tent",
  },
  {
    id: "6",
    title: "Block & Rehearse - Scene 1",
    startHour: 8,
    startMinute: 30,
    endHour: 9,
    endMinute: 30,
    department: "talent-hmu",
    notes: "Director + talent on set",
  },
  {
    id: "7",
    title: "Shoot - Scene 1 (Wide & Medium)",
    startHour: 9,
    startMinute: 30,
    endHour: 11,
    endMinute: 30,
    department: "camera-grip",
    notes: "A-cam wide, B-cam medium",
  },
  {
    id: "8",
    title: "Shoot - Scene 1 (Close-ups)",
    startHour: 11,
    startMinute: 30,
    endHour: 12,
    endMinute: 30,
    department: "camera-grip",
    notes: "Insert shots & product hero",
  },
  {
    id: "9",
    title: "Lunch Break",
    startHour: 12,
    startMinute: 30,
    endHour: 13,
    endMinute: 30,
    department: "meals-breaks",
    notes: "Hot meal - catering tent",
  },
  {
    id: "10",
    title: "Set Redress - Scene 2",
    startHour: 13,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
    department: "art",
    notes: "Living room transformation",
  },
  {
    id: "11",
    title: "Touch-up & Wardrobe Change",
    startHour: 13,
    startMinute: 30,
    endHour: 14,
    endMinute: 0,
    department: "talent-hmu",
    notes: "Look C for afternoon scenes",
  },
  {
    id: "12",
    title: "Lighting Setup - Scene 2",
    startHour: 14,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    department: "camera-grip",
    notes: "Practicals + overhead soft box",
  },
  {
    id: "13",
    title: "Shoot - Scene 2",
    startHour: 15,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    department: "camera-grip",
    notes: "Full coverage - all angles",
  },
  {
    id: "14",
    title: "Afternoon Snack",
    startHour: 17,
    startMinute: 0,
    endHour: 17,
    endMinute: 30,
    department: "meals-breaks",
    notes: "Craft services",
  },
  {
    id: "15",
    title: "Shoot - B-Roll & Pickups",
    startHour: 17,
    startMinute: 30,
    endHour: 19,
    endMinute: 0,
    department: "camera-grip",
    notes: "Establishing shots, product inserts",
  },
  {
    id: "16",
    title: "Wrap & Gear Breakdown",
    startHour: 19,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
    department: "camera-grip",
    notes: "All departments - secure equipment",
  },
]

export function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

export function getEventDurationMinutes(event: ScheduleEvent): number {
  return (event.endHour * 60 + event.endMinute) - (event.startHour * 60 + event.startMinute)
}

export function getEventStartOffset(event: ScheduleEvent, timelineStartHour: number): number {
  return (event.startHour * 60 + event.startMinute) - timelineStartHour * 60
}

// --- New planner state (minutes-from-midnight, categories) ---

/** Default categories derived from legacy departments (for initial state). */
export const defaultCategories: Category[] = [
  { id: "camera-grip", name: "Camera & Grip", colorKey: "blue" },
  { id: "art", name: "Art Department", colorKey: "violet" },
  { id: "talent-hmu", name: "Talent & Hair/Makeup", colorKey: "emerald" },
  { id: "meals-breaks", name: "Meals & Breaks", colorKey: "orange" },
]

/** Convert legacy ScheduleEvent to PlannerEvent (minutes from midnight). */
function toPlannerEvent(e: ScheduleEvent): PlannerEvent {
  const startMinutes = e.startHour * 60 + e.startMinute
  const endMinutes = e.endHour * 60 + e.endMinute
  return {
    id: e.id,
    title: e.title,
    startMinutes,
    endMinutes,
    categoryId: e.department,
    notes: e.notes,
  }
}

/** Initial planner events (same data as scheduleEvents, new shape). */
export const initialPlannerEvents: PlannerEvent[] = scheduleEvents.map(toPlannerEvent)
