import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase.server";

export const runtime = "nodejs";

const gateSchema = z
  .object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().max(120).optional(),
  })
  .strict();

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`gate:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = gateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name?.trim() || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("maywood_event_emails").insert({
      email,
      name,
      source: "maywood-events-map",
      user_agent: userAgent,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadyRegistered: true });
      }
      console.error("Email gate insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save your email. Try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Email gate error:", err);
    return NextResponse.json(
      { error: "Email collection is not configured yet." },
      { status: 503 }
    );
  }
}
