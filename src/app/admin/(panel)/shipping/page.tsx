import type { Metadata } from "next";
import { ShippingManager } from "@/components/admin/shipping-manager";

export const metadata: Metadata = { title: "Gestión de envíos" };
export const dynamic = "force-dynamic";

export default function AdminShippingPage() {
  return <ShippingManager />;
}
