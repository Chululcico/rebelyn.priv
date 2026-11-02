import type { Metadata } from "next";
import { listShippingMethods } from "@/lib/shipping";
import { CheckoutClient } from "@/components/store/checkout-client";

export const metadata: Metadata = { title: "Finalizar compra" };

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const methods = await listShippingMethods();
  return <CheckoutClient methods={methods.map((m) => ({ id: m.id, name: m.name, priceCents: m.priceCents, freeOverCents: m.freeOverCents, estimatedDays: m.estimatedDays }))} />;
}
