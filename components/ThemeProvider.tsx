"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
  type ThemeMode,
} from "@/lib/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = getStoredTheme();
    setModeState(stored);
    const next = resolveTheme(stored);
    setResolved(next);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      const next = resolveTheme("system");
      setResolved(next);
      applyTheme("system");
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  function setMode(next: ThemeMode) {
    setModeState(next);
    setStoredTheme(next);
    const resolvedNext = resolveTheme(next);
    setResolved(resolvedNext);
    applyTheme(next);
  }

  function toggle() {
    const nextResolved = resolved === "dark" ? "light" : "dark";
    setMode(nextResolved);
  }

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
