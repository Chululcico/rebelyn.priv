"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";
import { formatMoney } from "@/lib/money";
import { Pagination, SearchBar, StatusBadge } from "./shared";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  email: string;
  shipName: string;
  totalCents: number;
  createdAt: string;
  items: { qty: number; productName: string }[];
};

const STATUSES = ["", "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export function OrdersTable() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const status = sp.get("status") ?? "";
  const page = Number(sp.get("page") ?? 1);
  const [data, setData] = useState<{ orders: Order[]; total: number; page: number; perPage: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: Order[]; total: number; page: number; perPage: number }>(
      `/api/admin/orders?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${page}`,
    )
      .then(setData)
      .catch((e) => setError(e.message));
  }, [q, status, page]);

  if (error) return <p className="text-[1.4rem] text-magenta">{error}</p>;

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-5">Pedidos</h1>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <SearchBar placeholder="Buscar por nº, email o nombre…" path="/admin/orders" />
        <label className="flex items-center gap-2 text-[1.3rem] mb-4">
          Estado
          <select
            className="field py-2 w-auto"
            defaultValue={status}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set("status", e.target.value);
              else params.delete("status");
              params.delete("page");
              window.location.search = params.toString();
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s || "Todos"}</option>
            ))}
          </select>
        </label>
      </div>

      {!data ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <>
          <div className="overflow-x-auto border hairline bg-paper">
            <table className="w-full text-left text-[1.3rem]">
              <thead>
                <tr className="border-b hairline">
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Pedido</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Fecha</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Cliente</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Artículos</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Total</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id} className="border-b hairline last:border-0 hover:bg-wash">
                    <td className="p-3"><Link href={`/admin/orders/${order.id}`} className="underline">{order.orderNumber}</Link></td>
                    <td className="p-3 text-muted">{new Date(order.createdAt).toLocaleDateString("es-ES")}</td>
                    <td className="p-3">
                      {order.shipName}
                      <span className="block text-[1.1rem] text-muted">{order.email}</span>
                    </td>
                    <td className="p-3 text-muted truncate max-w-[24rem]">{order.items.map((i) => `${i.qty}× ${i.productName}`).join(", ")}</td>
                    <td className="p-3">{formatMoney(order.totalCents)}</td>
                    <td className="p-3"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} perPage={data.perPage} total={data.total} basePath="/admin/orders" />
        </>
      )}
    </div>
  );
}
