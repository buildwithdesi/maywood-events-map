"use client";

import { Moon, Sun } from "@phosphor-icons/react";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-soft transition hover:border-brand/40 hover:text-brand active:scale-[0.97]"
    >
      {resolved === "dark" ? (
        <Sun size={15} weight="fill" />
      ) : (
        <Moon size={15} weight="fill" />
      )}
    </button>
  );
}
