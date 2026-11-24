import type { Metadata } from "next";
import { SITE_URL } from "@/lib/base-path";
import GateGuard from "@/components/GateGuard";
import MaywoodPlanner from "@/components/planner/MaywoodPlanner";

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/planner` },
};

export default function PlannerPage() {
  return (
    <GateGuard intent="planner">
      <MaywoodPlanner />
    </GateGuard>
  );
}
