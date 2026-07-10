import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase.server";

export const runtime = "nodejs";

function adminOk(req: Request): boolean {
  const url = new URL(req.url);
  const secret =
    req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  const expected = process.env.ADMIN_EXPORT_SECRET;
  return Boolean(expected && secret === expected);
}

export async function GET(req: Request) {
  if (!adminOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit("admin-subs", 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const status = new URL(req.url).searchParams.get("status") || "pending";

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("maywood_event_submissions")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      return NextResponse.json({ error: "Failed to load." }, { status: 500 });
    }

    const withUrls = await Promise.all(
      (data || []).map(async (row) => {
        let photoUrl: string | null = null;
        if (row.photo_path) {
          const { data: signed } = await supabase.storage
            .from("maywood-event-photos")
            .createSignedUrl(row.photo_path, 300);
          photoUrl = signed?.signedUrl || null;
        }
        return { ...row, photoUrl };
      })
    );

    return NextResponse.json({ submissions: withUrls });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
}

const reviewSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["approved", "rejected"]),
    adminNote: z.string().trim().max(500).optional(),
  })
  .strict();

export async function PATCH(req: Request) {
  if (!adminOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("maywood_event_submissions")
      .update({
        status: parsed.data.status,
        admin_note: parsed.data.adminNote || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id);

    if (error) {
      console.error(error.message);
      return NextResponse.json({ error: "Update failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
}
