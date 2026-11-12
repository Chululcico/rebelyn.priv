"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";
import { formatMoney } from "@/lib/money";

type Dashboard = {
  sales: { todayCents: number; todayCount: number; weekCents: number; weekCount: number; monthCents: number; monthCount: number };
  orders: { pending: number; shipped: number };
  products: { total: number; lowStock: { name: string; size: string; color: string | null; stock: number }[] };
  topProducts: { name: string; slug: string; units: number; revenue: number }[];
  recentOrders: { id: string; orderNumber: string; status: string; totalCents: number; createdAt: string; shipName: string }[];
  customers: number;
  online: number;
};

export function DashboardClient() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api<Dashboard>("/api/admin/dashboard")
        .then((d) => {
          if (!cancelled) setData(d);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    }
    load();
    // Refresca las cifras (incluidos usuarios activos) sin recargar la página.
    const interval = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (error) return <p className="text-[1.4rem] text-magenta">{error}</p>;
  if (!data) return <p className="text-muted">Cargando dashboard…</p>;

  const stats = [
    { label: "Activos ahora", value: String(data.online), sub: "últimos 3 minutos" },
    { label: "Ventas hoy", value: formatMoney(data.sales.todayCents), sub: `${data.sales.todayCount} pedidos` },
    { label: "Ventas 7 días", value: formatMoney(data.sales.weekCents), sub: `${data.sales.weekCount} pedidos` },
    { label: "Ventas mes", value: formatMoney(data.sales.monthCents), sub: `${data.sales.monthCount} pedidos` },
    { label: "Pedidos pendientes", value: String(data.orders.pending), sub: "de pago" },
    { label: "Enviados", value: String(data.orders.shipped), sub: "en tránsito" },
    { label: "Clientes", value: String(data.customers), sub: "registrados" },
  ];

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="border hairline bg-paper p-5">
            <p className="text-[1.2rem] uppercase tracking-[0.1em] text-muted">{stat.label}</p>
            <p className="text-[2.2rem] mt-1">{stat.value}</p>
            <p className="text-[1.15rem] text-muted">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Pedidos recientes</h2>
          <ul className="border-t hairline">
            {data.recentOrders.map((order) => (
              <li key={order.id} className="flex justify-between gap-3 py-3 border-b hairline text-[1.3rem]">
                <Link href={`/admin/orders/${order.id}`} className="underline">{order.orderNumber}</Link>
                <span className="text-muted truncate">{order.shipName}</span>
                <span>{formatMoney(order.totalCents)}</span>
                <span className="text-muted text-[1.15rem]">{order.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Top productos</h2>
          <ul className="border-t hairline mb-8">
            {data.topProducts.map((product) => (
              <li key={product.slug} className="flex justify-between gap-3 py-3 border-b hairline text-[1.3rem]">
                <Link href={`/product/${product.slug}`} className="underline truncate">{product.name}</Link>
                <span className="text-muted">{product.units} uds</span>
                <span>{formatMoney(product.revenue)}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Stock bajo (≤ 5)</h2>
          <ul className="border-t hairline">
            {data.products.lowStock.map((item, i) => (
              <li key={i} className="flex justify-between gap-3 py-3 border-b hairline text-[1.3rem]">
                <span>{item.name} · {item.size}{item.color ? ` · ${item.color}` : ""}</span>
                <span className={item.stock === 0 ? "text-magenta" : "text-muted"}>{item.stock} uds</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
