"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Map" },
  { href: "/planner", label: "Planner" },
  { href: "/submit", label: "Submit event" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
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
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
