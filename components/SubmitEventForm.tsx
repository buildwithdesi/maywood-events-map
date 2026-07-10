"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import DaFooter from "@/components/DaFooter";
import SiteNav from "@/components/SiteNav";
import { CATEGORIES } from "@/lib/events";

export default function SubmitEventForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/submit", { method: "POST", body: data });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Submission failed.");
        setStatus("error");
        return;
      }
      setStatus("done");
      form.reset();
    } catch {
      setError("Network error. Try again.");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="border-b border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
              Community
            </p>
            <h1 className="font-display text-xl font-bold text-ink">
              Submit an event
            </h1>
          </div>
          <SiteNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        {status === "done" ? (
          <div className="rounded-2xl border border-brand/30 bg-brand-soft p-6">
            <h2 className="font-display text-lg font-bold text-ink">
              Got it. Thanks!
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Your event is in the review queue. Once approved, it shows up on the
              map and planner.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setStatus("idle")}
                className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white"
              >
                Submit another
              </button>
              <Link
                href="/"
                className="rounded-full border border-line px-4 py-2 text-xs font-semibold"
              >
                Back to map
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-ink-soft">
              Missing from the map? Send the details (and a photo if you have one).
              We review before it goes live.
            </p>

            <Field label="Event title *" name="title" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date *" name="date" type="date" required />
              <Field
                label="Time *"
                name="timeLabel"
                placeholder="e.g. 5:30 PM – 7:00 PM"
                required
              />
            </div>
            <Field label="Venue *" name="venue" required />
            <Field
              label="Address *"
              name="address"
              placeholder="Street / intersection, Maywood IL"
              required
            />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Category
              </span>
              <select
                name="category"
                defaultValue="community"
                className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Description
              </span>
              <textarea
                name="description"
                rows={4}
                className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="What should people know?"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Your email *" name="submitterEmail" type="email" required />
              <Field label="Your name" name="submitterName" />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Photo (optional, max 5MB)
              </span>
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="text-sm"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-xl bg-brand px-4 py-3 font-display text-sm font-bold text-white disabled:opacity-50"
            >
              {status === "loading" ? "Sending…" : "Submit for review"}
            </button>
          </form>
        )}
      </main>
      <DaFooter />
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}
