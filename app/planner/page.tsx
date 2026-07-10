import GateGuard from "@/components/GateGuard";
import MaywoodPlanner from "@/components/planner/MaywoodPlanner";

export default function PlannerPage() {
  return (
    <GateGuard intent="planner">
      <MaywoodPlanner />
    </GateGuard>
  );
}
