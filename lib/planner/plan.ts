import type { PlannerPlan } from "@/lib/planner/types";

const STORAGE_KEY = "maywood-planner-v1";
const READY_KEY = "maywood-planner-ready-v1";

const DEFAULT_PLAN: PlannerPlan = {
  name: "",
  savedIds: [],
  notes: {},
};

export function emptyPlan(): PlannerPlan {
  return { name: "", savedIds: [], notes: {} };
}

function normalizePlan(parsed: Partial<PlannerPlan>): PlannerPlan {
  return {
    name: typeof parsed.name === "string" ? parsed.name : "",
    savedIds: Array.isArray(parsed.savedIds)
      ? parsed.savedIds.filter((id): id is string => typeof id === "string")
      : [],
    notes:
      parsed.notes && typeof parsed.notes === "object"
        ? Object.fromEntries(
            Object.entries(parsed.notes).filter(
              ([, v]) => typeof v === "string" && v.trim()
            )
          )
        : {},
  };
}

export function loadPlan(): PlannerPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPlan();
    return normalizePlan(JSON.parse(raw) as Partial<PlannerPlan>);
  } catch {
    return emptyPlan();
  }
}

export function savePlan(plan: PlannerPlan) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function loadReady(): boolean {
  return localStorage.getItem(READY_KEY) === "1";
}

export function saveReady(ready: boolean) {
  if (ready) localStorage.setItem(READY_KEY, "1");
  else localStorage.removeItem(READY_KEY);
}

export function clearPlanQuery() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("plan")) return;
  url.searchParams.delete("plan");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function encodePlan(plan: PlannerPlan): string {
  const notes = Object.entries(plan.notes).filter(([, v]) => v.trim());
  const payload = {
    n: plan.name,
    s: plan.savedIds,
    o: notes.length ? Object.fromEntries(notes) : undefined,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodePlan(token: string): PlannerPlan | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(padded)));
    const payload = JSON.parse(json) as {
      n?: string;
      s?: string[];
      o?: Record<string, string>;
    };
    return normalizePlan({
      name: payload.n || "",
      savedIds: payload.s || [],
      notes: payload.o || {},
    });
  } catch {
    return null;
  }
}

export function planFromUrl(): PlannerPlan | null {
  const token = new URLSearchParams(window.location.search).get("plan");
  if (!token) return null;
  return decodePlan(token);
}

export function extractPlanToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes("plan=")) {
      return new URL(trimmed).searchParams.get("plan");
    }
  } catch {
    // raw token
  }
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}

export function shareUrl(plan: PlannerPlan): string {
  const url = new URL(window.location.href);
  url.pathname = "/planner";
  url.searchParams.set("plan", encodePlan(plan));
  return url.toString();
}

export { DEFAULT_PLAN };
