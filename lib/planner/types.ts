import type { CategoryId, MaywoodEvent } from "@/lib/events";
import { CATEGORY_MAP, EVENTS } from "@/lib/events";

export type PlannerTab = "browse" | "plan";

export interface PlannerPlan {
  name: string;
  savedIds: string[];
  notes: Record<string, string>;
}

export interface PlannerEvent extends MaywoodEvent {
  emoji: string;
  slot: "morning" | "afternoon" | "evening";
  startMinutes: number;
  weekday: string;
}

function parseStartMinutes(timeLabel: string): number {
  // Prefer first HH:MM AM/PM in the string
  const match = timeLabel.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) {
    // Fallback like "Fri 5–10 PM"
    const loose = timeLabel.match(/(\d{1,2})\s*[–-].*(AM|PM)/i);
    if (loose) {
      let h = Number(loose[1]);
      const ap = loose[2].toUpperCase();
      if (ap === "PM" && h < 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return h * 60;
    }
    return 12 * 60;
  }
  let h = Number(match[1]);
  const m = Number(match[2] || 0);
  const ap = match[3].toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function slotFromMinutes(mins: number): PlannerEvent["slot"] {
  if (mins < 12 * 60) return "morning";
  if (mins < 17 * 60) return "afternoon";
  return "evening";
}

function weekdayFromDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export function toPlannerEvent(event: MaywoodEvent): PlannerEvent {
  const startMinutes = parseStartMinutes(event.timeLabel);
  return {
    ...event,
    emoji: CATEGORY_MAP[event.category as CategoryId]?.emoji ?? "📍",
    startMinutes,
    slot: slotFromMinutes(startMinutes),
    weekday: weekdayFromDate(event.date),
  };
}

export const PLANNER_EVENTS: PlannerEvent[] = EVENTS.map(toPlannerEvent);

export const PLANNER_DAYS = (() => {
  const seen = new Map<string, { date: string; label: string }>();
  for (const e of PLANNER_EVENTS) {
    if (!seen.has(e.date)) {
      seen.set(e.date, {
        date: e.date,
        label: e.dateLabel.replace(/,.*/, "") || e.weekday,
      });
    }
  }
  return Array.from(seen.values());
})();

export function sortChronological(events: PlannerEvent[]): PlannerEvent[] {
  return events
    .slice()
    .sort((a, b) =>
      a.date === b.date ? a.startMinutes - b.startMinutes : a.date.localeCompare(b.date)
    );
}
