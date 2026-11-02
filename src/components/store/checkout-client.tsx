"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-context";

type ShippingMethod = { id: string; name: string; priceCents: number; freeOverCents: number | null; estimatedDays: string };

type Props = { methods: ShippingMethod[] };

const EMPTY = {
  email: "",
  phone: "",
  name: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "ES",
};

export function CheckoutClient({ methods }: Props) {
  const { lines, subtotalCents, discount, refresh } = useCart();
  const [shipping, setShipping] = useState(EMPTY);
  const [method, setMethod] = useState(methods[0]?.id ?? "standard");
  const [note, setNote] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeMethod = methods.find((m) => m.id === method) ?? methods[0];
  const shippingCents =
    activeMethod?.freeOverCents != null && subtotalCents >= activeMethod.freeOverCents ? 0 : activeMethod?.priceCents ?? 0;
  const discountCents = discount?.valid ? discount.discountCents : 0;
  const estimatedTotal = Math.max(0, subtotalCents - discountCents) + shippingCents;

  if (lines.length === 0) {
    return (
      <section className="page-width py-24 text-center">
        <h1 className="title-section">Tu carrito está vacío</h1>
        <Link href="/shop" className="button mt-6">Ver catálogo</Link>
      </section>
    );
  }

  async function createOrder(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shipping,
          shippingMethod: method,
          discountCode: discount?.valid ? discount.code : "",
          customerNote: note,
          acceptTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No hemos podido crear el pedido.");
        if (data.orderNumber) setError(`${data.error ?? "Pago no disponible."} Pedido ${data.orderNumber}.`);
        return;
      }
      await refresh();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      window.location.href = `/success?order=${encodeURIComponent(data.orderNumber)}`;
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-width py-10">
      <h1 className="title-section">Finalizar compra</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_38rem]">
        <div>
          <form onSubmit={createOrder}>
            <h2 className="text-[1.6rem] uppercase tracking-[0.14em] mb-4">Contacto y envío</h2>

            <div className="grid gap-0 md:grid-cols-2 md:gap-x-4">
              <label className="block mb-4 md:col-span-2">
                <span className="label">Nombre y apellidos</span>
                <input className="field" required minLength={2} value={shipping.name} onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))} autoComplete="name" />
              </label>
              <label className="block mb-4">
                <span className="label">Email</span>
                <input className="field" type="email" required value={shipping.email} onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))} autoComplete="email" />
              </label>
              <label className="block mb-4">
                <span className="label">Teléfono</span>
                <input className="field" type="tel" required minLength={7} value={shipping.phone} onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))} autoComplete="tel" inputMode="tel" />
              </label>
              <label className="block mb-4 md:col-span-2">
                <span className="label">Dirección</span>
                <input className="field" required minLength={3} value={shipping.line1} onChange={(e) => setShipping((s) => ({ ...s, line1: e.target.value }))} autoComplete="street-address" />
              </label>
              <label className="block mb-4">
                <span className="label">Código postal</span>
                <input className="field" required pattern="[0-9]{5}" value={shipping.postalCode} onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))} autoComplete="postal-code" inputMode="numeric" />
              </label>
              <label className="block mb-4">
                <span className="label">Ciudad</span>
                <input className="field" required value={shipping.city} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} autoComplete="address-level2" />
              </label>
              <label className="block mb-4">
                <span className="label">Provincia</span>
                <input className="field" required value={shipping.province} onChange={(e) => setShipping((s) => ({ ...s, province: e.target.value }))} autoComplete="address-level1" />
              </label>
              <label className="block mb-4">
                <span className="label">País</span>
                <input className="field" required value={shipping.country} onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))} autoComplete="country" maxLength={2} />
              </label>
            </div>

            <h2 className="text-[1.6rem] uppercase tracking-[0.14em] mt-6 mb-4">Método de envío</h2>
            <div className="flex flex-col gap-2 mb-6">
              {methods.map((m) => (
                <label key={m.id} className="flex items-center justify-between border hairline p-4 cursor-pointer has-[:checked]:border-ink">
                  <span className="flex items-center gap-3">
                    <input type="radio" name="shipping" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <span>
                      <span className="text-[1.4rem]">{m.name}</span>
                      <span className="block text-[1.2rem] text-muted">{m.estimatedDays}</span>
                    </span>
                  </span>
                  <span className="text-[1.4rem]">
                    {m.freeOverCents != null && subtotalCents >= m.freeOverCents ? "Gratis" : formatMoney(m.priceCents)}
                  </span>
                </label>
              ))}
            </div>

            <label className="block mb-4">
              <span className="label">Notas del pedido (opcional)</span>
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </label>

            <label className="flex items-start gap-3 text-[1.3rem] mb-6">
              <input type="checkbox" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 w-5 h-5" />
              <span>
                He leído y acepto las{" "}
                <Link href="/terms" target="_blank" className="underline">condiciones generales de compra</Link>, la{" "}
                <Link href="/privacy" target="_blank" className="underline">política de privacidad</Link> y la{" "}
                <Link href="/returns" target="_blank" className="underline">política de devoluciones</Link>.
              </span>
            </label>

            {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}

            <button className="button w-full" type="submit" disabled={submitting || !acceptTerms}>
              {submitting ? "Redirigiendo a SumUp…" : `Pagar con SumUp · ${formatMoney(estimatedTotal)}`}
            </button>
            <p className="text-[1.2rem] text-muted mt-3 text-center">
              Serás redirigido a la pasarela segura de SumUp para completar el pago.
            </p>
          </form>
        </div>

        <aside className="border hairline p-6 h-fit lg:sticky lg:top-24">
          <h2 className="text-[1.5rem] uppercase tracking-[0.16em] mb-4">Tu pedido</h2>
          <ul className="flex flex-col gap-3 mb-4">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3 text-[1.35rem]">
                <span>
                  {line.qty} × {line.name} <span className="text-muted">({line.colorName ? `${line.colorName} · ` : ""}{line.size})</span>
                </span>
                <span>{formatMoney(line.totalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 text-[1.35rem] border-t hairline pt-4">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(subtotalCents)}</dd></div>
            {discount?.valid && (
              <div className="flex justify-between text-magenta"><dt>Descuento {discount.code}</dt><dd>−{formatMoney(discount.discountCents)}</dd></div>
            )}
            <div className="flex justify-between"><dt>Envío</dt><dd>{shippingCents === 0 ? "Gratis" : formatMoney(shippingCents)}</dd></div>
          </dl>
          <div className="flex justify-between border-t hairline mt-3 pt-3 text-[1.6rem] uppercase tracking-[0.1em]">
            <span>Total</span>
            <span>{formatMoney(estimatedTotal)}</span>
          </div>
          <p className="text-[1.2rem] text-muted mt-3">Impuestos incluidos.</p>
        </aside>
      </div>
    </section>
  );
}
