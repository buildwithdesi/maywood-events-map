"use client";

import { useEffect, useState } from "react";

import DaFooter from "@/components/DaFooter";
import EmailGate, { hasGateUnlock } from "@/components/EmailGate";
import MaywoodMap from "@/components/MaywoodMap";

interface MapShellProps {
  apiKey: string;
  mapId: string;
}

export default function MapShell({ apiKey, mapId }: MapShellProps) {
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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <MaywoodMap apiKey={apiKey} mapId={mapId} />
      </div>
      <DaFooter />
    </div>
  );
}
