"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";

type OrderSummary = {
  orderNumber: string;
  status: string;
  paidAt: string | null;
  trackingNumber: string | null;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  shipName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipProvince: string;
  shipPostalCode: string;
  shipCountry: string;
  paymentMethod: string | null;
  items: { productName: string; size: string; colorName: string | null; qty: number; totalCents: number; imageUrl: string | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
  PROCESSING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export function SuccessClient() {
  return (
    <Suspense fallback={<section className="page-width py-16 text-center text-muted">Cargando…</section>}>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "";
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "manual">("idle");

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No encontramos el pedido.");
      setStatus("manual");
      return;
    }
    setOrder(data.order);
    setStatus("idle");
  }

  useEffect(() => {
    // Si el email está en la sesión local (último pedido), se consulta solo.
    const remembered = typeof window !== "undefined" ? localStorage.getItem("rb_last_email") : null;
    if (orderNumber && remembered) {
      setEmail(remembered);
      void lookup();
    } else if (orderNumber) {
      setStatus("manual");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  useEffect(() => {
    if (order) {
      try {
        localStorage.setItem("rb_last_email", email);
      } catch {
        /* almacenamiento bloqueado */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  if (!orderNumber) {
    return (
      <section className="page-width py-24 text-center">
        <h1 className="title-section">No hay pedidos que mostrar</h1>
        <Link href="/shop" className="button mt-6">Ver tienda</Link>
      </section>
    );
  }

  if (order) {
    return (
      <section className="page-width py-14 max-w-[72rem]">
        <div className="text-center mb-10">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-volt text-ink text-[2.4rem] mb-4" aria-hidden="true">✓</span>
          <h1 className="title-section mb-2">Pedido realizado</h1>
          <p className="text-[1.5rem]">Gracias por tu compra. Tu pedido <strong>{order.orderNumber}</strong> está confirmado.</p>
          <p className="text-[1.35rem] text-muted mt-1">Estado: {STATUS_LABEL[order.status] ?? order.status}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="border hairline p-6">
            <h2 className="text-[1.4rem] uppercase tracking-[0.14em] mb-4">Productos</h2>
            <ul className="flex flex-col gap-3">
              {order.items.map((item, i) => (
                <li key={i} className="flex gap-3 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.imageUrl && <img src={item.imageUrl} alt="" width={48} height={64} className="w-12 h-16 object-cover bg-wash" />}
                  <span className="flex-1 text-[1.35rem]">
                    {item.qty} × {item.productName}
                    <span className="block text-[1.2rem] text-muted">{item.colorName ? `${item.colorName} · ` : ""}Talla {item.size}</span>
                  </span>
                  <span className="text-[1.35rem]">{formatMoney(item.totalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1 text-[1.3rem] border-t hairline mt-4 pt-3">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>Envío</dt><dd>{order.shippingCents === 0 ? "Gratis" : formatMoney(order.shippingCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between"><dt>Descuento</dt><dd>−{formatMoney(order.discountCents)}</dd></div>}
              <div className="flex justify-between text-[1.5rem] border-t hairline mt-2 pt-2"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
            </dl>
          </div>

          <div className="flex flex-col gap-6">
            <div className="border hairline p-6">
              <h2 className="text-[1.4rem] uppercase tracking-[0.14em] mb-3">Envío</h2>
              <p className="text-[1.35rem]">
                {order.shipName}
                <br />
                {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}
                <br />
                {order.shipPostalCode} {order.shipCity} ({order.shipProvince}), {order.shipCountry}
              </p>
              {order.trackingNumber && (
                <p className="text-[1.3rem] mt-3">Seguimiento: <strong>{order.trackingNumber}</strong></p>
              )}
            </div>
            <div className="border hairline p-6">
              <h2 className="text-[1.4rem] uppercase tracking-[0.14em] mb-3">Pago</h2>
              <p className="text-[1.35rem]">
                {order.paymentMethod ? `Método: ${order.paymentMethod}` : "Pago confirmado"}
                <br />
                {order.paidAt ? `Confirmado el ${new Date(order.paidAt).toLocaleDateString("es-ES")}` : ""}
              </p>
              <p className="text-[1.25rem] text-muted mt-3">
                Te enviaremos un email en cuanto el paquete salga, con el número de seguimiento.
              </p>
            </div>
            <Link href="/shop" className="button button--secondary">Seguir comprando</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-width py-20 max-w-[48rem]">
      <h1 className="title-section">Pedido {orderNumber}</h1>
      <p className="text-[1.4rem] text-muted mb-6">
        Si el pago se ha completado, introduce el email con el que compraste para ver el resumen.
      </p>
      <form onSubmit={lookup} className="flex flex-col gap-3">
        <label>
          <span className="label">Email del pedido</span>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <button className="button" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Buscando…" : "Ver pedido"}
        </button>
      </form>
      {error && <p className="text-[1.35rem] text-magenta mt-4">{error}</p>}
      <p className="text-[1.3rem] text-muted mt-6">
        ¿Cuentas con cuenta? <Link href="/account" className="underline">Consulta tus pedidos</Link>.
      </p>
    </section>
  );
}
