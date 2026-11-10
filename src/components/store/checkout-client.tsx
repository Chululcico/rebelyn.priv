"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-context";
import { PaymentLogo, SecurePaymentBadge } from "./payment-logos";

type ShippingOption = {
  id: string;
  name: string;
  priceCents: number;
  freeOverCents: number | null;
  estimatedDays: string;
};

type PaymentMethodDto = { id: string; label: string; description: string; logos: string[] };
type TotalsDto = {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  discountCode: string | null;
  methodId: string;
};
type PayData = { draftId: string; checkoutUrl: string; methods: PaymentMethodDto[]; totals: TotalsDto };

type Props = { methods: ShippingOption[] };

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
  const { lines, subtotalCents, discount } = useCart();
  const [shipping, setShipping] = useState(EMPTY);
  const [note, setNote] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState(methods[0]?.id ?? "");

  // Paso 2: pago (métodos + redirección a la pasarela segura)
  const [step, setStep] = useState<"data" | "pay">("data");
  const [pay, setPay] = useState<PayData | null>(null);

  // Precio FIJO del método elegido (gratis si se supera el umbral del método).
  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedMethodId) ?? methods[0] ?? null,
    [methods, selectedMethodId],
  );
  const freeApplied =
    selectedMethod?.freeOverCents != null && subtotalCents >= selectedMethod.freeOverCents;
  const shippingCents = selectedMethod ? (freeApplied ? 0 : selectedMethod.priceCents) : 0;
  const discountCents = discount?.valid ? discount.discountCents : 0;
  const estimatedTotal = Math.max(0, subtotalCents - discountCents) + shippingCents;

  // En el paso de pago se muestran los totales REALES calculados en servidor.
  const shownSubtotal = step === "pay" && pay ? pay.totals.subtotalCents : subtotalCents;
  const shownDiscount = step === "pay" && pay ? pay.totals.discountCents : discountCents;
  const shownDiscountCode = step === "pay" && pay ? pay.totals.discountCode : discount?.valid ? discount.code : null;
  const shownShipping = step === "pay" && pay ? pay.totals.shippingCents : shippingCents;
  const shownTotal = step === "pay" && pay ? pay.totals.totalCents : estimatedTotal;

  // Métodos de pago visibles: Apple Pay solo si el dispositivo lo soporta,
  // Google Pay se oculta en Safari (no está disponible ahí).
  const visibleMethods = useMemo(() => {
    if (!pay) return [];
    const canApplePay = typeof window !== "undefined" && "ApplePaySession" in window;
    const isSafari =
      typeof window !== "undefined" &&
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return pay.methods.filter((m) =>
      m.id === "applepay" ? canApplePay : m.id === "googlepay" ? !isSafari : true,
    );
  }, [pay]);

  if (lines.length === 0 && !(step === "pay" && pay)) {
    return (
      <section className="page-width py-24 text-center">
        <h1 className="title-section">Tu carrito está vacío</h1>
        <Link href="/shop" className="button mt-6">Ver catálogo</Link>
      </section>
    );
  }

  /**
   * Paso 1 → valida los datos y prepara el pago.
   * IMPORTANTE: el pedido NO se registra aquí; solo se guarda un borrador
   * y se crea el pago en SumUp. El pedido se crea cuando el pago se confirma.
   */
  async function continueToPayment(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedMethod?.id) {
      setError("Selecciona un método de envío disponible.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shipping,
          shippingMethod: selectedMethod.id,
          discountCode: discount?.valid ? discount.code : "",
          customerNote: note,
          acceptTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.checkoutUrl) {
        setError(data.error ?? "No hemos podido preparar el pago.");
        return;
      }
      setPay({ draftId: data.draftId, checkoutUrl: data.checkoutUrl, methods: data.methods || [], totals: data.totals });
      setStep("pay");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Paso 2 → el cliente elige método y va a la pasarela segura de SumUp. */
  function goToPaymentGateway() {
    if (!pay?.checkoutUrl) return;
    setSubmitting(true);
    window.location.href = pay.checkoutUrl;
  }

  return (
    <section className="page-width py-10">
      <h1 className="title-section">Finalizar compra</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_38rem]">
        <div>
          {step === "pay" && pay ? (
            <div>
              {/* Pasos */}
              <ol className="flex items-center gap-3 text-[1.2rem] uppercase tracking-[0.14em] text-muted mb-6" aria-label="Pasos del checkout">
                <li className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full border hairline text-[1rem]">✓</span> Datos y envío</li>
                <span aria-hidden="true">—</span>
                <li className="flex items-center gap-2 text-ink"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ink text-paper text-[1rem]">2</span> Pago</li>
              </ol>

              <button type="button" className="underline text-[1.3rem] mb-6" onClick={() => { setStep("data"); setError(null); }}>
                ← Volver a mis datos
              </button>

              <h2 className="text-[1.6rem] uppercase tracking-[0.14em] mb-2">Método de pago</h2>
              <p className="text-[1.3rem] text-muted mb-5">
                Elige cómo quieres pagar <strong>{formatMoney(pay.totals.totalCents)}</strong>. El pedido solo se registra si el pago se confirma.
              </p>

              <ul className="flex flex-col gap-3 mb-6">
                {visibleMethods.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="w-full text-left border hairline p-4 cursor-pointer flex items-center justify-between gap-4 hover:border-ink disabled:opacity-50"
                      disabled={submitting}
                      onClick={goToPaymentGateway}
                    >
                      <span>
                        <span className="text-[1.5rem]">{m.label}</span>
                        <span className="block text-[1.2rem] text-muted mt-1">{m.description}</span>
                      </span>
                      {m.logos[0] && <PaymentLogo id={m.logos[0]} className="shrink-0" />}
                    </button>
                  </li>
                ))}
                {visibleMethods.length === 0 && (
                  <li className="text-[1.3rem] text-magenta">No hay métodos de pago disponibles ahora mismo. Contáctanos en hola@rebelyn.net.</li>
                )}
              </ul>

              {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}

              {submitting && <p className="text-[1.3rem] text-muted mb-4">Redirigiendo al pago…</p>}

              <div className="flex justify-center">
                <SecurePaymentBadge />
              </div>
              <p className="text-[1.2rem] text-muted mt-3 text-center">
                Pulsa tu método de pago y serás redirigido a la pasarela segura de SumUp. Tus datos de pago nunca pasan por nuestra tienda.
              </p>
            </div>
          ) : (
            <form onSubmit={continueToPayment}>
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
                  <input className="field" required pattern="[0-9]{5}" value={shipping.postalCode} onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))} autoComplete="postal-code" inputMode="numeric" />
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
                  <input className="field" required value={shipping.country} onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value.toUpperCase().slice(0, 2) }))} autoComplete="country" maxLength={2} />
                </label>
              </div>

              <h2 className="text-[1.6rem] uppercase tracking-[0.14em] mt-6 mb-2">Método de envío</h2>
              <p className="text-[1.2rem] text-muted mb-3">Envío desde Elda (Alicante) a toda España. Precio fijo por método.</p>
              <div className="flex flex-col gap-2 mb-6">
                {methods.map((m) => {
                  const isFree = m.freeOverCents != null && subtotalCents >= m.freeOverCents;
                  return (
                    <label key={m.id} className="flex items-center justify-between border hairline p-4 cursor-pointer has-[:checked]:border-ink">
                      <span className="flex items-center gap-3">
                        <input type="radio" name="shipping" value={m.id} checked={selectedMethodId === m.id} onChange={() => setSelectedMethodId(m.id)} required />
                        <span>
                          <span className="text-[1.4rem]">{m.name}</span>
                          <span className="block text-[1.2rem] text-muted">
                            {m.estimatedDays}
                            {m.freeOverCents != null && ` · Gratis a partir de ${formatMoney(m.freeOverCents)}`}
                          </span>
                        </span>
                      </span>
                      <span className="text-[1.4rem]">{isFree ? "Gratis" : formatMoney(m.priceCents)}</span>
                    </label>
                  );
                })}
                {methods.length === 0 && (
                  <p className="text-[1.3rem] text-magenta">No hay métodos de envío activos. Configura los precios en el panel de administración.</p>
                )}
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

              <button className="button w-full" type="submit" disabled={submitting || !acceptTerms || !selectedMethod}>
                {submitting ? "Preparando el pago…" : `Continuar al pago · ${formatMoney(estimatedTotal)}`}
              </button>
              <p className="text-[1.2rem] text-muted mt-3 text-center">
                En el siguiente paso elegirás el método de pago. El importe se valida en servidor.
              </p>
            </form>
          )}
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
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(shownSubtotal)}</dd></div>
            {shownDiscountCode && (
              <div className="flex justify-between text-magenta"><dt>Descuento {shownDiscountCode}</dt><dd>−{formatMoney(shownDiscount)}</dd></div>
            )}
            <div className="flex justify-between"><dt>Envío</dt><dd>{shownShipping === 0 ? "Gratis" : formatMoney(shownShipping)}</dd></div>
          </dl>
          <div className="flex justify-between border-t hairline mt-3 pt-3 text-[1.6rem] uppercase tracking-[0.1em]">
            <span>Total</span>
            <span>{formatMoney(shownTotal)}</span>
          </div>
          <p className="text-[1.2rem] text-muted mt-3">Impuestos incluidos. Total final confirmado en servidor.</p>
        </aside>
      </div>
    </section>
  );
}
