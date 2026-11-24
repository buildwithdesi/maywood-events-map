import type { Metadata } from "next";
import { SITE_URL } from "@/lib/base-path";
import GateGuard from "@/components/GateGuard";
import SubmitEventForm from "@/components/SubmitEventForm";

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/submit` },
};

export default function SubmitPage() {
  return (
    <GateGuard intent="submit">
      <SubmitEventForm />
    </GateGuard>
  );
}
