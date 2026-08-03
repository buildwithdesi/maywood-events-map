import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase.server";

export const runtime = "nodejs";

/**
 * Quote one CSV field.
 *
 * Every value is quoted, not just `name` — an unquoted comma in any column
 * silently shifts every field after it. The leading-apostrophe guard defuses
 * spreadsheet formula injection: `email` and `name` arrive from the public
 * signup form, so a value like `=HYPERLINK("http://evil","click")` would
 * otherwise execute when the export is opened in Excel or Sheets.
 */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${guarded.replaceAll('"', '""')}"`;
}

/**
 * Export collected emails for Desi.
 * GET /api/emails            header: x-admin-secret: YOUR_ADMIN_EXPORT_SECRET
 * GET /api/emails?format=csv same header
 *
 * The secret is header-only. It is never accepted from the query string,
 * because this endpoint returns the entire subscriber list.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  if (!isAdmin(req)) {
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
        ...(data ?? []).map((row) =>
          [row.email, row.name, row.source, row.created_at]
            .map(csvCell)
            .join(",")
        ),
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
