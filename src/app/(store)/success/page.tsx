import type { Metadata } from "next";
import { SuccessClient } from "@/components/store/success-client";

export const metadata: Metadata = { title: "Pedido confirmado" };
export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return <SuccessClient />;
}
