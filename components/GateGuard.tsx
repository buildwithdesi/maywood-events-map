"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import EmailGate from "@/components/EmailGate";
import { hasGateUnlock } from "@/lib/gate";

interface GateGuardProps {
  children: ReactNode;
  /**
   * map = after unlock go to / (default home)
   * planner = stay on planner (deep link)
   * submit = after unlock go to map first
   */
  intent?: "map" | "planner" | "submit";
}

export default function GateGuard({ children, intent = "map" }: GateGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(hasGateUnlock());
    setReady(true);
  }, []);

  function handleUnlocked() {
    if (intent === "planner") {
      setUnlocked(true);
      return;
    }
    // Map-first hierarchy for home + submit entry points
    router.replace("/");
  }

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!unlocked) {
    return <EmailGate intent={intent} onUnlocked={handleUnlocked} />;
  }

  return <>{children}</>;
}
