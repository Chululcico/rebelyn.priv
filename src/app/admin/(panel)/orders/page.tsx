import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersTable } from "@/components/admin/orders-table";

export const metadata: Metadata = { title: "Pedidos" };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <OrdersTable />
    </Suspense>
  );
}
