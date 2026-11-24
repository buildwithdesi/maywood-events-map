import type { Metadata } from "next";
import AdminSubmissions from "@/components/AdminSubmissions";

// Staff-only screen: keep it out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminSubmissions />;
}
