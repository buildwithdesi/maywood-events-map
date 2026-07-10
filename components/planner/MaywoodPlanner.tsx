"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import DaFooter from "@/components/DaFooter";
import SiteNav from "@/components/SiteNav";
import { CATEGORIES, CATEGORY_MAP, type CategoryId } from "@/lib/events";
import { downloadItinerary, printItinerary } from "@/lib/planner/exportHtml";
import { downloadIcs } from "@/lib/planner/ics";
import {
  clearPlanQuery,
  decodePlan,
  emptyPlan,
  extractPlanToken,
  loadPlan,
  loadReady,
  planFromUrl,
  savePlan,
  saveReady,
  shareUrl,
} from "@/lib/planner/plan";
import type { TravelLeg } from "@/lib/planner/travel";
import {
  PLANNER_DAYS,
  PLANNER_EVENTS,
  sortChronological,
  type PlannerEvent,
  type PlannerPlan,
  type PlannerTab,
} from "@/lib/planner/types";

export default function MaywoodPlanner() {
  const [hydrated, setHydrated] = useState(false);
  const [plan, setPlan] = useState<PlannerPlan>(emptyPlan);
  const [viewingShared, setViewingShared] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<PlannerTab>("browse");
  const [day, setDay] = useState<string>("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [compareInput, setCompareInput] = useState("");
  const [friendPlan, setFriendPlan] = useState<PlannerPlan | null>(null);
  const [compareError, setCompareError] = useState("");
  const [legs, setLegs] = useState<TravelLeg[]>([]);
  const [travelSource, setTravelSource] = useState<"google" | "estimate" | null>(
    null
  );
  const [travelLoading, setTravelLoading] = useState(false);
  const [ownSnapshot] = useState(() =>
    typeof window === "undefined" ? emptyPlan() : loadPlan()
  );

  useEffect(() => {
    const fromUrl = planFromUrl();
    if (fromUrl) {
      setPlan(fromUrl);
      setViewingShared(true);
      setReady(Boolean(fromUrl.name));
    } else {
      const stored = loadPlan();
      setPlan(stored);
      setReady(loadReady() && Boolean(stored.name));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || viewingShared) return;
    savePlan(plan);
  }, [plan, viewingShared, hydrated]);

  useEffect(() => {
    if (!hydrated || viewingShared) return;
    saveReady(ready);
  }, [ready, viewingShared, hydrated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLANNER_EVENTS.filter((e) => {
      if (day !== "all" && e.date !== day) return false;
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    });
  }, [day, category, query]);

  const savedEvents = useMemo(() => {
    const byId = new Map(PLANNER_EVENTS.map((e) => [e.id, e]));
    return sortChronological(
      plan.savedIds
        .map((id) => byId.get(id))
        .filter((e): e is PlannerEvent => Boolean(e))
    );
  }, [plan.savedIds]);

  useEffect(() => {
    if (!hydrated || tab !== "plan" || savedEvents.length < 2) {
      setLegs([]);
      setTravelSource(null);
      return;
    }

    let cancelled = false;
    async function loadTravel() {
      setTravelLoading(true);
      try {
        const res = await fetch("/api/travel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: savedEvents.map((e) => ({
              id: e.id,
              lat: e.lat,
              lng: e.lng,
            })),
          }),
        });
        const data = (await res.json()) as {
          legs?: TravelLeg[];
          source?: "google" | "estimate";
        };
        if (!cancelled) {
          setLegs(data.legs || []);
          setTravelSource(data.source || null);
        }
      } catch {
        if (!cancelled) {
          setLegs([]);
          setTravelSource(null);
        }
      } finally {
        if (!cancelled) setTravelLoading(false);
      }
    }

    loadTravel();
    return () => {
      cancelled = true;
    };
  }, [hydrated, tab, savedEvents]);

  function toggleSave(id: string) {
    setPlan((p) => ({
      ...p,
      savedIds: p.savedIds.includes(id)
        ? p.savedIds.filter((x) => x !== id)
        : [...p.savedIds, id],
    }));
  }

  function setNote(id: string, note: string) {
    setPlan((p) => {
      const notes = { ...p.notes };
      if (!note.trim()) delete notes[id];
      else notes[id] = note;
      return { ...p, notes };
    });
  }

  async function copyShare() {
    const url = shareUrl(plan);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this share link:", url);
    }
  }

  function runCompare() {
    setCompareError("");
    const token = extractPlanToken(compareInput);
    if (!token) {
      setCompareError("Paste a valid planner share link.");
      return;
    }
    const friend = decodePlan(token);
    if (!friend) {
      setCompareError("Could not read that plan.");
      return;
    }
    setFriendPlan(friend);
  }

  const friendOverlap = useMemo(() => {
    if (!friendPlan) return new Set<string>();
    return new Set(friendPlan.savedIds.filter((id) => plan.savedIds.includes(id)));
  }, [friendPlan, plan.savedIds]);

  const legByFrom = useMemo(
    () => new Map(legs.map((l) => [l.fromId, l])),
    [legs]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-ink-soft">
        Loading planner…
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
          <SiteNav />
          <h1 className="font-display text-3xl font-bold text-ink">
            Plan your Maywood summer
          </h1>
          <p className="text-sm text-ink-soft">
            Every event from the map lives here too. Save what you want, sort your day,
            see travel time between stops, then export or share. The map is for looking
            around. This is for building your personal itinerary.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Your name
            </span>
            <input
              value={plan.name}
              onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Desi"
              className="rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </label>
          <button
            disabled={!plan.name.trim()}
            onClick={() => setReady(true)}
            className="rounded-xl bg-brand px-4 py-3 font-display text-sm font-bold text-white disabled:opacity-50"
          >
            Start planning
          </button>
          <Link href="/" className="text-center text-sm text-brand hover:underline">
            ← Back to map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="border-b border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
                {plan.name}&apos;s plan
              </p>
              <h1 className="font-display text-xl font-bold text-ink">
                Maywood Summer Planner
              </h1>
              <p className="text-xs text-ink-soft">
                All {PLANNER_EVENTS.length} events · save, order your day, travel times
              </p>
            </div>
            <SiteNav />
          </div>

          {viewingShared && (
            <div className="rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-ink">
              Viewing a shared plan.
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setViewingShared(false);
                    savePlan(plan);
                    saveReady(true);
                    clearPlanQuery();
                  }}
                  className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white"
                >
                  Use this plan
                </button>
                <button
                  onClick={() => {
                    const blank = emptyPlan();
                    setPlan(blank);
                    setViewingShared(false);
                    setReady(false);
                    savePlan(blank);
                    saveReady(false);
                    clearPlanQuery();
                  }}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold"
                >
                  Start my own
                </button>
                {ownSnapshot.name && (
                  <button
                    onClick={() => {
                      setPlan(loadPlan());
                      setViewingShared(false);
                      setReady(true);
                      clearPlanQuery();
                    }}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    Back to my plan
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <TabChip active={tab === "browse"} onClick={() => setTab("browse")}>
              Browse
            </TabChip>
            <TabChip active={tab === "plan"} onClick={() => setTab("plan")}>
              My plan ({plan.savedIds.length})
            </TabChip>
            <button
              onClick={copyShare}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand"
            >
              {copied ? "Link copied" : "Share plan"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {tab === "browse" && (
          <div className="flex flex-col gap-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events…"
              className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={day === "all"} onClick={() => setDay("all")}>
                All days
              </FilterChip>
              {PLANNER_DAYS.map((d) => (
                <FilterChip
                  key={d.date}
                  active={day === d.date}
                  onClick={() => setDay(d.date)}
                >
                  {d.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={category === "all"}
                onClick={() => setCategory("all")}
              >
                All categories
              </FilterChip>
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  {c.emoji} {c.label}
                </FilterChip>
              ))}
            </div>

            <ul className="flex flex-col gap-2">
              {filtered.map((event) => {
                const saved = plan.savedIds.includes(event.id);
                const cat = CATEGORY_MAP[event.category];
                return (
                  <li
                    key={event.id}
                    className="rounded-2xl border border-line bg-surface p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl" aria-hidden>
                        {event.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-semibold text-ink">
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-brand-dark">
                          {event.dateLabel} · {event.timeLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          📍 {event.venue} · {cat.label}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSave(event.id)}
                        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
                        style={{
                          background: saved ? "var(--brand)" : "var(--surface-muted)",
                          color: saved ? "#fff" : "var(--ink-soft)",
                        }}
                      >
                        {saved ? "Saved" : "Save"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "plan" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadItinerary(plan, PLANNER_EVENTS, legs)}
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
              >
                Export HTML
              </button>
              <button
                onClick={() => downloadIcs(plan, PLANNER_EVENTS)}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
              >
                Export ICS
              </button>
              <button
                onClick={() => printItinerary(plan, PLANNER_EVENTS, legs)}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
              >
                Print / PDF
              </button>
            </div>

            {travelLoading && (
              <p className="text-xs text-ink-soft">Calculating travel times…</p>
            )}
            {!travelLoading && travelSource && savedEvents.length >= 2 && (
              <p className="text-xs text-ink-soft">
                Travel times:{" "}
                {travelSource === "google"
                  ? "Google driving estimates"
                  : "straight-line estimates (enable Distance Matrix API for live drive times)"}
              </p>
            )}

            {savedEvents.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
                No events saved yet. Browse and tap Save.
              </p>
            )}

            <ul className="flex flex-col gap-2">
              {savedEvents.map((event, i) => {
                const leg = i < savedEvents.length - 1 ? legByFrom.get(event.id) : null;
                const overlap = friendOverlap.has(event.id);
                return (
                  <li key={event.id}>
                    <div
                      className="rounded-2xl border bg-surface p-3"
                      style={{
                        borderColor: overlap ? "var(--brand)" : "var(--line)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl" aria-hidden>
                          {event.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-semibold text-ink">
                            {event.title}
                            {overlap ? " · both of you" : ""}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-brand-dark">
                            {event.dateLabel} · {event.timeLabel}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            📍 {event.venue}
                          </p>
                          <textarea
                            value={plan.notes[event.id] || ""}
                            onChange={(e) => setNote(event.id, e.target.value)}
                            placeholder="Add a note…"
                            rows={2}
                            className="mt-2 w-full rounded-lg border border-line bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-brand"
                          />
                        </div>
                        <button
                          onClick={() => toggleSave(event.id)}
                          className="text-xs font-semibold text-ink-soft hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {leg && (
                      <div className="my-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold text-brand-dark">
                        <span aria-hidden>🚗</span>
                        <span>
                          {leg.durationText} · {leg.distanceText} to next
                        </span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${event.lat},${event.lng}&destination=${savedEvents[i + 1].lat},${savedEvents[i + 1].lng}&travelmode=driving`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto underline"
                        >
                          Directions
                        </a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="font-display text-sm font-semibold text-ink">
                Compare with a friend
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Paste their share link to see overlapping events.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={compareInput}
                  onChange={(e) => setCompareInput(e.target.value)}
                  placeholder="https://…/planner?plan=…"
                  className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-xs outline-none focus:border-brand"
                />
                <button
                  onClick={runCompare}
                  className="rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white"
                >
                  Compare
                </button>
              </div>
              {compareError && (
                <p className="mt-2 text-xs text-red-600">{compareError}</p>
              )}
              {friendPlan && (
                <p className="mt-2 text-xs text-ink-soft">
                  {friendPlan.name || "Friend"}: {friendOverlap.size} shared of{" "}
                  {friendPlan.savedIds.length} saved.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <DaFooter />
    </div>
  );
}

function TabChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{
        background: active ? "var(--brand)" : "var(--surface-muted)",
        color: active ? "#fff" : "var(--ink-soft)",
      }}
    >
      {children}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        background: active ? "var(--brand-soft)" : "transparent",
        borderColor: active ? "var(--brand)" : "var(--line)",
        color: active ? "var(--brand-dark)" : "var(--ink-soft)",
      }}
    >
      {children}
    </button>
  );
}
