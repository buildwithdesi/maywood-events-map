"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Map", shortLabel: "Map" },
  { href: "/planner", label: "Planner", shortLabel: "Planner" },
  { href: "/submit", label: "Submit event", shortLabel: "Submit" },
] as const;

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between gap-2">
      <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" aria-label="Main">
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={{
                background: active ? "var(--brand)" : "var(--surface-muted)",
                color: active ? "#fff" : "var(--ink-soft)",
                border: active ? "1px solid var(--brand)" : "1px solid var(--line)",
              }}
            >
              <span className="sm:hidden">{link.shortLabel}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <ThemeToggle />
    </div>
  );
}
