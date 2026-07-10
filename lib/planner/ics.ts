import type { PlannerEvent, PlannerPlan } from "@/lib/planner/types";
import { sortChronological } from "@/lib/planner/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsLocal(date: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
}

function escIcs(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcs(plan: PlannerPlan, events: PlannerEvent[]): string {
  const byId = new Map(events.map((e) => [e.id, e]));
  const saved = sortChronological(
    plan.savedIds.map((id) => byId.get(id)).filter((e): e is PlannerEvent => Boolean(e))
  );

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const vevents = saved
    .map((e) => {
      const note = plan.notes[e.id]?.trim();
      const end = Math.min(e.startMinutes + 120, 23 * 60 + 59);
      const desc = [e.venue, e.address, note ? `Note: ${note}` : "", e.description]
        .filter(Boolean)
        .join("\\n");

      return [
        "BEGIN:VEVENT",
        `UID:maywood-${e.id}@maywood-events-map`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${toIcsLocal(e.date, e.startMinutes)}`,
        `DTEND:${toIcsLocal(e.date, end)}`,
        `SUMMARY:${escIcs(e.title)}`,
        `LOCATION:${escIcs(`${e.venue}, ${e.address}`)}`,
        `DESCRIPTION:${escIcs(desc)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Maywood Events Map//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escIcs((plan.name || "My") + " Maywood Summer 2026")}`,
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(plan: PlannerPlan, events: PlannerEvent[]) {
  const blob = new Blob([buildIcs(plan, events)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (plan.name || "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  a.href = url;
  a.download = `maywood-2026-${slug || "plan"}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
