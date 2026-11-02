import type { Metadata } from "next";
import { DiscountsManager } from "@/components/admin/managers";

export const metadata: Metadata = { title: "Descuentos" };

export default function AdminDiscountsPage() {
  return <DiscountsManager />;
}
