import GateGuard from "@/components/GateGuard";
import SubmitEventForm from "@/components/SubmitEventForm";

export default function SubmitPage() {
  return (
    <GateGuard intent="submit">
      <SubmitEventForm />
    </GateGuard>
  );
}
