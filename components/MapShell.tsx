"use client";

import { useEffect, useState } from "react";

import DaFooter from "@/components/DaFooter";
import EmailGate from "@/components/EmailGate";
import MaywoodMap from "@/components/MaywoodMap";
import { hasGateUnlock } from "@/lib/gate";

export default function MapShell() {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(hasGateUnlock());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!unlocked) {
    return <EmailGate intent="map" onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <MaywoodMap />
      </div>
      <DaFooter />
    </div>
  );
}
