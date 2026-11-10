"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-context";
import { SecurePaymentBadge } from "./payment-logos";

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

type Screen = "idle" | "loading" | "pending" | "failed" | "manual";

export function SuccessClient() {
  return (
    <Suspense fallback={<section className="page-width py-16 text-center text-muted">Cargando…</section>}>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft") ?? "";
  const orderNumberParam = searchParams.get("order") ?? "";
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("idle");
  const { refresh } = useCart();

  /**
   * Flujo nuevo (pago primero): SumUp nos devuelve con ?draft=<id>.
   * Confirmamos el pago en SERVIDOR (contra la API de SumUp) y, solo si está
   * pagado, se registra el pedido y se muestra el número + resumen.
   */
  async function verifyDraft() {
    if (!draftId) return;
    setScreen("loading");
    setError(null);
    try {
      const res = await fetch("/api/orders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setOrder(data.order);
        setScreen("idle");
        void refresh(); // el carrito ya se vació en servidor
        return;
      }
      if (data?.reason === "pending" || res.status === 202) {
        setScreen("pending");
        setError(data?.error ?? "Tu pago todavía no consta como confirmado.");
        return;
      }
      setScreen("failed");
      setError(data?.error ?? "No pudimos confirmar el pago.");
    } catch {
      setScreen("pending");
      setError("Error de conexión al confirmar el pago. Inténtalo de nuevo.");
    }
  }

  /** Flujo de consulta manual (pedido ya existente por número + email). */
  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setScreen("loading");
    setError(null);
    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: orderNumberParam, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No encontramos el pedido.");
      setScreen("manual");
      return;
    }
    setOrder(data.order);
    setScreen("idle");
  }

  useEffect(() => {
    if (draftId) {
      void verifyDraft();
      return;
    }
    if (orderNumberParam) {
      // Si el email está en la sesión local (último pedido), se consulta solo.
      const remembered = typeof window !== "undefined" ? localStorage.getItem("rb_last_email") : null;
      if (remembered) {
        setEmail(remembered);
        void lookup();
      } else {
        setScreen("manual");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, orderNumberParam]);

  useEffect(() => {
    if (order && email) {
      try {
        localStorage.setItem("rb_last_email", email);
      } catch {
        /* almacenamiento bloqueado */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Sin borrador ni número de pedido: nada que mostrar.
  if (!draftId && !orderNumberParam) {
    return (
      <section className="page-width py-24 text-center">
        <h1 className="title-section">No hay pedidos que mostrar</h1>
        <Link href="/shop" className="button mt-6">Ver tienda</Link>
      </section>
    );
  }

  // Confirmado: número de pedido + resumen.
  if (order) {
    return (
      <section className="page-width py-14 max-w-[72rem]">
        <div className="text-center mb-10">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-volt text-ink text-[2.4rem] mb-4" aria-hidden="true">✓</span>
          <h1 className="title-section mb-2">¡Pago completado!</h1>
          <p className="text-[1.5rem]">
            Gracias por tu compra. Tu pedido es <strong>{order.orderNumber}</strong>
          </p>
          <p className="text-[1.35rem] text-muted mt-1">Estado: {STATUS_LABEL[order.status] ?? order.status}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="border hairline p-6">
            <h2 className="text-[1.4rem] uppercase tracking-[0.14em] mb-4">Resumen del pedido</h2>
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
              <div className="flex justify-between text-[1.5rem] border-t hairline mt-2 pt-2"><dt>Total pagado</dt><dd>{formatMoney(order.totalCents)}</dd></div>
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
                {order.paymentMethod ? `Método: ${order.paymentMethod === "card" ? "Tarjeta" : order.paymentMethod}` : "Pago confirmado"}
                <br />
                {order.paidAt ? `Confirmado el ${new Date(order.paidAt).toLocaleDateString("es-ES")} a las ${new Date(order.paidAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
              <div className="mt-4">
                <SecurePaymentBadge />
              </div>
              <p className="text-[1.25rem] text-muted mt-3">
                Te enviaremos un email con la confirmación y otro cuando el paquete salga, con el número de seguimiento.
              </p>
            </div>
            <Link href="/shop" className="button button--secondary">Seguir comprando</Link>
          </div>
        </div>
      </section>
    );
  }

  // Vuelta de SumUp con ?draft=: confirmando el pago en servidor…
  if (draftId) {
    if (screen === "loading" || screen === "idle") {
      return (
        <section className="page-width py-24 max-w-[48rem] text-center">
          <h1 className="title-section mb-4">Confirmando tu pago…</h1>
          <p className="text-[1.4rem] text-muted">Estamos verificando el pago con la pasarela. No cierres esta página; tarda unos segundos.</p>
        </section>
      );
    }

    if (screen === "pending") {
      return (
        <section className="page-width py-24 max-w-[48rem] text-center">
          <h1 className="title-section mb-4">Un momento…</h1>
          {error && <p className="text-[1.4rem] text-magenta mb-6">{error}</p>}
          <button className="button" type="button" onClick={() => void verifyDraft()}>Comprobar el pago de nuevo</button>
          <p className="text-[1.3rem] text-muted mt-6">
            ¿Ya se ha cobrado el importe? Espera unos segundos y vuelve a comprobar. Si sigue sin aparecer, escríbenos a <a href="mailto:hola@rebelyn.net" className="underline">hola@rebelyn.net</a>.
          </p>
        </section>
      );
    }

    return (
      <section className="page-width py-24 max-w-[48rem] text-center">
        <h1 className="title-section mb-4">El pago no se completó</h1>
        {error && <p className="text-[1.4rem] text-magenta mb-6">{error}</p>}
        <Link href="/checkout" className="button">Volver a intentarlo</Link>
        <p className="text-[1.3rem] text-muted mt-6">Tu carrito sigue intacto: puedes repetir el pago sin volver a rellenar nada.</p>
      </section>
    );
  }

  // Consulta manual con número + email (flujo clásico).
  return (
    <section className="page-width py-20 max-w-[48rem]">
      <h1 className="title-section">Pedido {orderNumberParam}</h1>
      <p className="text-[1.4rem] text-muted mb-6">
        Si el pago se ha completado, introduce el email con el que compraste para ver el resumen.
      </p>
      {screen === "loading" ? (
        <p className="text-[1.4rem] text-muted">Buscando…</p>
      ) : (
        <form onSubmit={lookup} className="flex flex-col gap-3">
          <label>
            <span className="label">Email del pedido</span>
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <button className="button" type="submit">
            Ver pedido
          </button>
        </form>
      )}
      {error && <p className="text-[1.35rem] text-magenta mt-4">{error}</p>}
      <p className="text-[1.3rem] text-muted mt-6">
        ¿Cuentas con cuenta? <Link href="/account" className="underline">Consulta tus pedidos</Link>.
      </p>
    </section>
  );
}
