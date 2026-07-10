import type { PlannerEvent, PlannerPlan } from "@/lib/planner/types";
import { sortChronological } from "@/lib/planner/types";
import type { TravelLeg } from "@/lib/planner/travel";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildItineraryHtml(
  plan: PlannerPlan,
  events: PlannerEvent[],
  legs: TravelLeg[] = []
): string {
  const byId = new Map(events.map((e) => [e.id, e]));
  const saved = sortChronological(
    plan.savedIds.map((id) => byId.get(id)).filter((e): e is PlannerEvent => Boolean(e))
  );

  const legByFrom = new Map(legs.map((l) => [l.fromId, l]));

  const cards = saved
    .map((e, i) => {
      const note = plan.notes[e.id]?.trim();
      const leg = i < saved.length - 1 ? legByFrom.get(e.id) : null;
      const travel = leg
        ? `<p class="travel">→ Next: ${esc(leg.durationText)} · ${esc(leg.distanceText)} (drive)</p>`
        : "";
      return `
      <article class="card">
        <div class="emoji">${esc(e.emoji)}</div>
        <div>
          <p class="when">${esc(e.dateLabel)} · ${esc(e.timeLabel)}</p>
          <h3>${esc(e.title)}</h3>
          <p class="meta">📍 ${esc(e.venue)}</p>
          ${note ? `<p class="note">${esc(note)}</p>` : ""}
          ${travel}
        </div>
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(plan.name || "My")} · Maywood Summer '26</title>
<style>
  body { margin:0; font-family: system-ui, sans-serif; background:#f4f1ea; color:#14261d; }
  .wrap { max-width:720px; margin:0 auto; padding:40px 20px 80px; }
  h1 { margin:0; font-size:2rem; letter-spacing:-0.03em; }
  .sub { color:#4b5a52; margin:8px 0 28px; }
  .card { display:flex; gap:14px; background:#fff; border:1px solid #e2ddd0; border-radius:16px; padding:16px; margin-bottom:12px; }
  .emoji { font-size:1.5rem; }
  .when { margin:0; font-size:12px; font-weight:700; color:#0f7a4d; }
  h3 { margin:4px 0; font-size:1.05rem; }
  .meta, .note, .travel { margin:4px 0 0; font-size:13px; color:#4b5a52; }
  .travel { color:#0f7a4d; font-weight:600; }
  .foot { margin-top:32px; font-size:12px; color:#4b5a52; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${esc(plan.name || "My")} · Maywood Summer '26</h1>
    <p class="sub">${saved.length} event${saved.length === 1 ? "" : "s"} planned</p>
    ${cards || "<p>No events saved yet.</p>"}
    <p class="foot">Built by Digital Alchemy · digitalalchemy.dev</p>
  </div>
</body>
</html>`;
}

export function downloadItinerary(
  plan: PlannerPlan,
  events: PlannerEvent[],
  legs: TravelLeg[] = []
) {
  const html = buildItineraryHtml(plan, events, legs);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maywood-itinerary-${(plan.name || "plan").toLowerCase().replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printItinerary(
  plan: PlannerPlan,
  events: PlannerEvent[],
  legs: TravelLeg[] = []
) {
  const html = buildItineraryHtml(plan, events, legs);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
