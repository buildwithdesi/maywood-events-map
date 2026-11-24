import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { rateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase.server";

export const runtime = "nodejs";

const categories = [
  "civic",
  "community",
  "health",
  "festival",
  "school",
  "business",
  "jobs",
] as const;

const fieldsSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeLabel: z.string().trim().min(3).max(120),
    venue: z.string().trim().min(2).max(160),
    address: z.string().trim().min(5).max(240),
    description: z.string().trim().max(2000).optional(),
    category: z.enum(categories).default("community"),
    submitterEmail: z.string().trim().email().max(254),
    submitterName: z.string().trim().max(120).optional(),
  })
  .strict();

function looksLikeImage(b: Buffer, mime: string): boolean {
  const starts = (sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
  switch (mime) {
    case "image/jpeg":
      return starts([0xff, 0xd8, 0xff]);
    case "image/png":
      return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return starts([0x47, 0x49, 0x46, 0x38]);
    case "image/webp":
      return starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8);
    default:
      return false;
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`submit:${ip}`, 5, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  // Refuse oversized bodies before buffering them (photo cap is 5MB + fields).
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Upload is too large." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const raw = {
    title: String(form.get("title") || ""),
    date: String(form.get("date") || ""),
    timeLabel: String(form.get("timeLabel") || ""),
    venue: String(form.get("venue") || ""),
    address: String(form.get("address") || ""),
    description: String(form.get("description") || ""),
    category: String(form.get("category") || "community"),
    submitterEmail: String(form.get("submitterEmail") || ""),
    submitterName: String(form.get("submitterName") || ""),
  };

  const parsed = fieldsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form fields and try again." },
      { status: 400 }
    );
  }

  const photo = form.get("photo");
  let photoPath: string | null = null;

  try {
    const supabase = getServiceSupabase();

    if (photo instanceof File && photo.size > 0) {
      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Photo must be under 5MB." },
          { status: 400 }
        );
      }
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(photo.type)) {
        return NextResponse.json(
          { error: "Photo must be JPG, PNG, WEBP, or GIF." },
          { status: 400 }
        );
      }
      const ext = photo.type.split("/")[1] || "jpg";
      photoPath = `${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await photo.arrayBuffer());
      // The browser-supplied MIME type is only a claim. Check the file's real
      // first bytes so a script or HTML file cannot be stored as "image/png".
      if (!looksLikeImage(buffer, photo.type)) {
        return NextResponse.json(
          { error: "Photo must be JPG, PNG, WEBP, or GIF." },
          { status: 400 }
        );
      }
      const { error: uploadError } = await supabase.storage
        .from("maywood-event-photos")
        .upload(photoPath, buffer, {
          contentType: photo.type,
          upsert: false,
        });
      if (uploadError) {
        console.error("Photo upload failed:", uploadError.message);
        return NextResponse.json(
          { error: "Could not upload photo." },
          { status: 500 }
        );
      }
    }

    const { error } = await supabase.from("maywood_event_submissions").insert({
      title: parsed.data.title,
      date: parsed.data.date,
      time_label: parsed.data.timeLabel,
      venue: parsed.data.venue,
      address: parsed.data.address,
      description: parsed.data.description || "",
      category: parsed.data.category,
      submitter_email: parsed.data.submitterEmail.toLowerCase(),
      submitter_name: parsed.data.submitterName || null,
      photo_path: photoPath,
      status: "pending",
    });

    if (error) {
      console.error("Submission insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save submission." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "Submissions are not configured yet." },
      { status: 503 }
    );
  }
}
