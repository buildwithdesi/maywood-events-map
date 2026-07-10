"use client";

import { ArrowUpRight } from "@phosphor-icons/react";

export default function DaFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`shrink-0 border-t border-line bg-surface/80 px-4 py-2.5 backdrop-blur-sm ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-ink-soft">
          <span className="font-display font-semibold text-ink">Digital Alchemy</span>
          <span className="mx-1.5 text-line">·</span>
          Built for Maywood by{" "}
          <a
            href="https://digitalalchemy.dev"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand transition hover:text-brand-dark"
          >
            Desmond Baker Jr.
          </a>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://digitalalchemy.dev"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold text-ink-soft transition hover:text-brand"
          >
            digitalalchemy.dev
          </a>
          <span className="text-line" aria-hidden>
            ·
          </span>
          <a
            href="https://beacons.ai/dbcreations"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-0.5 text-[11px] font-semibold text-brand transition hover:text-brand-dark"
          >
            Work with us
            <ArrowUpRight size={11} weight="bold" />
          </a>
        </div>
      </div>
    </footer>
  );
}
