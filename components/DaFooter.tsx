"use client";

import { ArrowUpRight } from "@phosphor-icons/react";

export default function DaFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`border-t border-white/10 bg-[#0A0B0D] px-5 py-3.5 ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-[#F5F5F7]/55">
          <span className="font-display text-xs font-semibold text-white">
            Digital Alchemy
          </span>
          <span className="mx-2 text-white/20">|</span>
          Built for the Maywood community by{" "}
          <a
            href="https://digitalalchemy.dev"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#40FF78] transition hover:text-[#40FF78]/80"
          >
            Desmond Baker Jr.
          </a>
          <span className="hidden sm:inline">
            {" "}
            Event details are community-sourced, confirm times with organizers.
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://digitalalchemy.dev"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#F5F5F7]/80 transition hover:border-[#00C8FF]/40 hover:text-[#00C8FF] active:scale-[0.97]"
          >
            digitalalchemy.dev
            <ArrowUpRight size={11} weight="bold" />
          </a>
          <a
            href="https://beacons.ai/dbcreations"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full bg-[#40FF78] px-3 py-1.5 text-[11px] font-bold text-[#0A0B0D] transition hover:brightness-110 active:scale-[0.97]"
          >
            Work with us
            <ArrowUpRight size={11} weight="bold" />
          </a>
        </div>
      </div>
    </footer>
  );
}
