"use client";

import { useEffect, useState, type ReactNode } from "react";

import EmailGate, { hasGateUnlock } from "@/components/EmailGate";

export default function GateGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(hasGateUnlock());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0A0B0D] text-[#F5F5F7]/70">
        Loading…
      </div>
    );
  }

  if (!unlocked) {
    return <EmailGate onUnlocked={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
}
