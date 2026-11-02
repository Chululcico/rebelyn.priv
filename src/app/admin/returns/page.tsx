import type { Metadata } from "next";
import { ReturnsManager } from "@/components/admin/managers";

export const metadata: Metadata = { title: "Devoluciones" };

export default function AdminReturnsPage() {
  return <ReturnsManager />;
}
