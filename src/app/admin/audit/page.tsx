import type { Metadata } from "next";
import { AuditTable } from "@/components/admin/managers";

export const metadata: Metadata = { title: "Auditoría" };

export default function AdminAuditPage() {
  return <AuditTable />;
}
