"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "./shared";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  email: string;
  phone: string | null;
  shipName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipProvince: string;
  shipPostalCode: string;
  shipCountry: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  customerNote: string | null;
  trackingNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  items: { id: string; productName: string; size: string; colorName: string | null; qty: number; totalCents: number; imageUrl: string | null }[];
  payments: { id: string; provider: string; status: string; method: string | null; amountCents: number; refunds: { id: string; amountCents: number; status: string }[] }[];
  returns: { id: string; status: string; reason: string; items: { qty: number }[] }[];
};

const STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export function OrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [tracking, setTracking] = useState("");
  const [saving, setSaving] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<{ order: Order }>(`/api/admin/orders/${id}`)
      .then((data) => {
        setOrder(data.order);
        setStatus(data.order.status);
        setTracking(data.order.trackingNumber ?? "");
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function saveStatus(event: React.FormEvent) {
    event.preventDefault();
    if (!order) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api(`/api/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status, trackingNumber: tracking }) });
      setMessage("Pedido actualizado.");
      const fresh = await api<{ order: Order }>(`/api/admin/orders/${order.id}`);
      setOrder(fresh.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function refund() {
    if (!order) return;
    const payment = order.payments.find((p) => p.status === "SUCCEEDED") ?? order.payments[0];
    if (!payment) {
      setError("Este pedido no tiene pagos registrados.");
      return;
    }
    if (!confirm(`¿Reembolsar${refundAmount ? ` ${refundAmount} €` : " el total"}?`)) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api("/api/admin/payments/refund", {
        method: "POST",
        body: JSON.stringify({
          paymentId: payment.id,
          ...(refundAmount ? { amountCents: Math.round(parseFloat(refundAmount) * 100) } : {}),
          reason: refundReason || undefined,
        }),
      });
      setMessage("Reembolso solicitado.");
      const fresh = await api<{ order: Order }>(`/api/admin/orders/${order.id}`);
      setOrder(fresh.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (error && !order) return <p className="text-[1.4rem] text-magenta">{error}</p>;
  if (!order) return <p className="text-muted">Cargando pedido…</p>;

  return (
    <div>
      <Link href="/admin/orders" className="text-[1.3rem] underline text-muted">← Volver a pedidos</Link>
      <div className="flex flex-wrap justify-between items-baseline gap-3 mt-2 mb-6">
        <h1 className="text-[2.2rem] uppercase tracking-[0.12em]">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>

      {error && <p className="text-[1.4rem] text-magenta mb-4" role="alert">{error}</p>}
      {message && <p className="text-[1.4rem] text-volt-dark mb-4" role="status">{message}</p>}

      <div className="grid gap-8 lg:grid-cols-[1fr_32rem]">
        <div>
          <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Artículos</h2>
          <ul className="border-t hairline bg-paper mb-6">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 items-center py-3 px-3 border-b hairline last:border-0">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-12 h-16 object-cover bg-wash" />
                )}
                <span className="flex-1 text-[1.35rem]">
                  {item.qty}× {item.productName}
                  <span className="block text-[1.15rem] text-muted">{item.colorName ? `${item.colorName} · ` : ""}Talla {item.size}</span>
                </span>
                <span className="text-[1.35rem]">{formatMoney(item.totalCents)}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Pagos</h2>
          <ul className="border-t hairline bg-paper mb-6">
            {order.payments.map((payment) => (
              <li key={payment.id} className="py-3 px-3 border-b hairline last:border-0 text-[1.3rem]">
                <span className="uppercase">{payment.provider} · {payment.method ?? "—"}</span>
                <span className="text-muted"> · {formatMoney(payment.amountCents)} · {payment.status}</span>
                {payment.refunds.length > 0 && (
                  <span className="block text-[1.15rem] text-magenta">
                    Reembolsos: {payment.refunds.map((r) => `${formatMoney(r.amountCents)} (${r.status})`).join(", ")}
                  </span>
                )}
              </li>
            ))}
            {order.payments.length === 0 && <li className="py-3 px-3 text-muted text-[1.3rem]">Sin pagos registrados.</li>}
          </ul>

          {order.returns.length > 0 && (
            <>
              <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Devoluciones</h2>
              <ul className="border-t hairline bg-paper mb-6">
                {order.returns.map((ret) => (
                  <li key={ret.id} className="py-3 px-3 border-b hairline last:border-0 text-[1.3rem]">
                    <StatusBadge status={ret.status} /> · {ret.items.reduce((sum, i) => sum + i.qty, 0)} uds
                    <span className="block text-[1.2rem] text-muted">{ret.reason}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <form onSubmit={saveStatus} className="border hairline bg-paper p-5">
            <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mb-4">Estado y seguimiento</h2>
            <label className="block mb-4">
              <span className="label">Estado</span>
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block mb-4">
              <span className="label">Nº seguimiento</span>
              <input className="field" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="ES123456789" />
            </label>
            <button className="button w-full" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
          </form>

          <div className="border hairline bg-paper p-5">
            <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mb-4">Reembolso</h2>
            <label className="block mb-3">
              <span className="label">Importe € (vacío = total)</span>
              <input className="field" inputMode="decimal" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </label>
            <label className="block mb-4">
              <span className="label">Motivo</span>
              <input className="field" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </label>
            <button className="button button--secondary w-full" type="button" disabled={saving} onClick={refund}>
              Reembolsar
            </button>
          </div>

          <div className="border hairline bg-paper p-5">
            <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mb-3">Cliente</h2>
            <p className="text-[1.3rem]">
              {order.shipName}
              <br />
              {order.email}
              {order.phone && (<><br />{order.phone}</>)}
            </p>
            <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mt-4 mb-2">Envío</h2>
            <p className="text-[1.3rem] text-muted">
              {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}
              <br />
              {order.shipPostalCode} {order.shipCity} ({order.shipProvince}), {order.shipCountry}
            </p>
            {order.customerNote && (
              <>
                <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mt-4 mb-2">Nota del cliente</h2>
                <p className="text-[1.3rem] text-muted">{order.customerNote}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
