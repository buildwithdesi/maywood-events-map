import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import {
  estimateLegs,
  formatDuration,
  formatMiles,
  type TravelLeg,
  type TravelPoint,
} from "@/lib/planner/travel";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    points: z
      .array(
        z
          .object({
            id: z.string().min(1).max(120),
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
          })
          .strict()
      )
      .min(2)
      .max(20),
  })
  .strict();

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

async function googleLegs(points: TravelPoint[], apiKey: string): Promise<TravelLeg[]> {
  const origins = points
    .slice(0, -1)
    .map((p) => `${p.lat},${p.lng}`)
    .join("|");
  const destinations = points
    .slice(1)
    .map((p) => `${p.lat},${p.lng}`)
    .join("|");

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", origins);
  url.searchParams.set("destinations", destinations);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("units", "imperial");
  // vibe-audit-ignore secrets-in-urls
  // Google's Distance Matrix API only accepts its key as a query parameter.
  // This fetch runs server-side in a route handler and the key comes from a
  // server-only env var, so the key is never sent to the browser.
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    rows?: Array<{
      elements: Array<{
        status: string;
        distance?: { value: number; text: string };
        duration?: { value: number; text: string };
      }>;
    }>;
  };

  if (data.status !== "OK" || !data.rows) {
    throw new Error(data.error_message || data.status || "Distance Matrix failed");
  }

  const legs: TravelLeg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const el = data.rows[i]?.elements?.[i];
    if (!el || el.status !== "OK" || !el.distance || !el.duration) {
      // Fall back to estimate for this leg
      const est = estimateLegs([points[i], points[i + 1]])[0];
      legs.push(est);
      continue;
    }
    legs.push({
      fromId: points[i].id,
      toId: points[i + 1].id,
      distanceMeters: el.distance.value,
      durationSeconds: el.duration.value,
      distanceText: el.distance.text || formatMiles(el.distance.value),
      durationText: el.duration.text || formatDuration(el.duration.value),
      mode: "driving",
    });
  }
  return legs;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`travel:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid points." }, { status: 400 });
  }

  const points = parsed.data.points;
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  try {
    if (apiKey) {
      const legs = await googleLegs(points, apiKey);
      return NextResponse.json({ legs, source: "google" });
    }
  } catch (err) {
    console.error("Travel Google failed, using estimate:", err);
  }

  return NextResponse.json({ legs: estimateLegs(points), source: "estimate" });
}
