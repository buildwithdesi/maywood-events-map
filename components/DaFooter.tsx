"use client";

export default function DaFooter() {
  return (
    <footer className="border-t border-line bg-[#0A0B0D] px-5 py-4 text-[11px] leading-relaxed text-[#F5F5F7]/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-white">
            Digital Alchemy
          </p>
          <p className="mt-0.5">
            Built for the Maywood community by{" "}
            <a
              href="https://digitalalchemy.dev"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#40FF78] hover:underline"
            >
              Desmond Baker Jr.
            </a>
            . Event details are community-sourced. Confirm times with organizers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://digitalalchemy.dev"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 px-3 py-1.5 font-semibold text-[#00C8FF] transition hover:border-[#00C8FF]/50 hover:bg-[#00C8FF]/10"
          >
            digitalalchemy.dev
          </a>
          <a
            href="https://beacons.ai/dbcreations"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#40FF78] px-3 py-1.5 font-semibold text-[#0A0B0D] transition hover:brightness-110"
          >
            beacons.ai/dbcreations
          </a>
        </div>
      </div>
    </footer>
  );
}
