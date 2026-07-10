"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Submission {
  id: string;
  title: string;
  date: string;
  time_label: string;
  venue: string;
  address: string;
  description: string;
  category: string;
  submitter_email: string;
  submitter_name: string | null;
  status: string;
  photoUrl: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(s: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions?secret=${encodeURIComponent(s)}&status=pending`);
      const data = (await res.json()) as {
        submissions?: Submission[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Unauthorized");
        setUnlocked(false);
        return;
      }
      setSubs(data.submissions || []);
      setUnlocked(true);
      sessionStorage.setItem("maywood-admin-secret", s);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("maywood-admin-secret");
    if (stored) {
      setSecret(stored);
      load(stored);
    }
  }, []);

  async function review(id: string, status: "approved" | "rejected") {
    const res = await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
      },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error || "Update failed");
    }
  }

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-3 px-4">
        <h1 className="font-display text-2xl font-bold">Admin · Submissions</h1>
        <p className="text-sm text-ink-soft">
          Enter your ADMIN_EXPORT_SECRET to review community event submissions.
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="rounded-xl border border-line px-3 py-2.5 text-sm"
          placeholder="Admin secret"
        />
        <button
          onClick={() => load(secret)}
          disabled={loading || !secret}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Link href="/" className="text-sm text-brand hover:underline">
          ← Map
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Pending submissions</h1>
        <Link href="/" className="text-sm text-brand hover:underline">
          Map
        </Link>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {subs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
          No pending submissions.
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {subs.map((s) => (
          <li key={s.id} className="rounded-2xl border border-line bg-surface p-4">
            {s.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.photoUrl}
                alt=""
                className="mb-3 max-h-48 w-full rounded-xl object-cover"
              />
            )}
            <h2 className="font-display text-lg font-bold">{s.title}</h2>
            <p className="text-xs font-medium text-brand-dark">
              {s.date} · {s.time_label}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              📍 {s.venue} — {s.address}
            </p>
            <p className="mt-2 text-sm">{s.description}</p>
            <p className="mt-2 text-xs text-ink-soft">
              From {s.submitter_name || "Anonymous"} · {s.submitter_email} ·{" "}
              {s.category}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => review(s.id, "approved")}
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
              >
                Approve
              </button>
              <button
                onClick={() => review(s.id, "rejected")}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
              >
                Reject
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">
              Approve marks it reviewed. Add it to{" "}
              <code className="rounded bg-surface-muted px-1">data/events.json</code>{" "}
              (or ask the agent) to put it on the live map.
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
