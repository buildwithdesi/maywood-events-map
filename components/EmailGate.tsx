"use client";

import { FormEvent, useState } from "react";

const STORAGE_KEY = "maywood-events-gate-v1";

interface EmailGateProps {
  onUnlocked: () => void;
}

export default function EmailGate({ onUnlocked }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });

      const data = (await res.json()) as { error?: string; ok?: boolean };

      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ email: email.trim().toLowerCase(), at: Date.now() })
      );
      onUnlocked();
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-[#0A0B0D]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(122,48,255,0.35), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(64,255,120,0.12), transparent 50%)",
        }}
      />

      {/* 100dvh + safe padding: centers when it fits, scrolls without clipping when it doesn't */}
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12131A] p-5 shadow-2xl sm:p-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#40FF78]">
            Maywood · Summer 2026
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
            Enter to explore the map
          </h1>
          <p className="mt-1.5 text-sm leading-snug text-[#F5F5F7]/70">
            Drop your email to unlock every Maywood summer event on one interactive map.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#F5F5F7]/60">
                Email <span className="text-[#40FF78]">*</span>
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="rounded-xl border border-white/10 bg-[#0A0B0D] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#40FF78]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#F5F5F7]/60">
                Name <span className="text-white/30">(optional)</span>
              </span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-white/10 bg-[#0A0B0D] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#40FF78]"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-1 rounded-xl bg-[#40FF78] px-4 py-2.5 font-display text-sm font-bold text-[#0A0B0D] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Unlocking…" : "Unlock the map"}
            </button>
          </form>

          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-[11px] leading-snug text-[#F5F5F7]/50">
              By continuing you agree we can email you about Maywood community events and
              Digital Alchemy updates. No spam.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a
                href="https://beacons.ai/dbcreations"
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center rounded-xl border border-[#40FF78]/40 bg-[#40FF78]/10 px-3 py-2 font-display text-sm font-semibold text-[#40FF78] transition hover:bg-[#40FF78]/20"
              >
                Visit Digital Alchemy →
              </a>
              <a
                href="https://digitalalchemy.dev"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/50 transition hover:border-[#00C8FF]/40 hover:text-[#00C8FF]"
              >
                digitalalchemy.dev
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function hasGateUnlock(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { email?: string };
    return Boolean(parsed.email);
  } catch {
    return false;
  }
}

export { STORAGE_KEY };
