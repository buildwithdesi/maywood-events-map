import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase.server";

export const runtime = "nodejs";

/**
 * Export collected emails for Desi.
 * GET /api/emails?secret=YOUR_ADMIN_EXPORT_SECRET
 * or header: x-admin-secret: YOUR_ADMIN_EXPORT_SECRET
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  const expected = process.env.ADMIN_EXPORT_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit("emails-export", 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("maywood_event_emails")
      .select("email, name, source, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Email export failed:", error.message);
      return NextResponse.json({ error: "Export failed." }, { status: 500 });
    }

    const format = url.searchParams.get("format");
    if (format === "csv") {
      const rows = [
        "email,name,source,created_at",
        ...(data ?? []).map((row) => {
          const name = (row.name ?? "").replaceAll('"', '""');
          return `${row.email},"${name}",${row.source},${row.created_at}`;
        }),
      ];
      return new NextResponse(rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="maywood-emails.csv"',
        },
      });
    }

    return NextResponse.json({
      count: data?.length ?? 0,
      emails: data ?? [],
    });
  } catch (err) {
    console.error("Email export error:", err);
    return NextResponse.json(
      { error: "Email collection is not configured yet." },
      { status: 503 }
    );
  }
}
