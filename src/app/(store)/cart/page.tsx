"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { useCart } from "@/components/store/cart-context";

export default function CartPage() {
  const { lines, subtotalCents, shipping, discount, totalCents, setQty, remove, applyDiscount, loading } = useCart();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  if (loading) {
    return (
      <section className="page-width py-16 text-center text-muted">Cargando carrito…</section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="page-width py-24 text-center">
        <h1 className="title-section">Tu carrito está vacío</h1>
        <p className="text-[1.5rem] text-muted mb-8">Visita la tienda para ver lo que hay disponible.</p>
        <Link href="/shop" className="button">Ver catálogo</Link>
      </section>
    );
  }

  return (
    <section className="page-width py-10">
      <h1 className="title-section">Tu carrito</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_36rem]">
        <div>
          <ul className="flex flex-col">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-5 py-6 border-b hairline first:border-t">
                <Link href={`/product/${line.slug}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={line.image ?? ""} alt={line.name} width={110} height={146} className="w-28 h-[16rem] object-cover bg-wash" />
                </Link>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between gap-4">
                    <Link href={`/product/${line.slug}`} className="text-[1.6rem]">{line.name}</Link>
                    <span className="text-[1.5rem]">{formatMoney(line.totalCents)}</span>
                  </div>
                  <p className="text-[1.3rem] text-muted mt-1 flex items-center gap-2">
                    {line.colorHex && <span className="swatch" style={{ background: line.colorHex }} />}
                    {line.colorName ? `${line.colorName} · ` : ""}Talla {line.size}
                  </p>
                  <p className="text-[1.25rem] text-muted">{formatMoney(line.unitPriceCents)} / unidad</p>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <div className="qty">
                      <button type="button" aria-label="Restar" onClick={() => setQty(line.id, line.qty - 1)}>−</button>
                      <span>{line.qty}</span>
                      <button
                        type="button"
                        aria-label="Sumar"
                        disabled={line.qty >= Math.min(line.maxStock, 10)}
                        onClick={() => setQty(line.id, line.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button type="button" className="text-[1.3rem] underline text-muted" onClick={() => remove(line.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/shop" className="text-[1.35rem] uppercase tracking-[0.12em] underline">← Continuar comprando</Link>
          </div>
        </div>

        <aside className="border hairline p-6 h-fit lg:sticky lg:top-24">
          <h2 className="text-[1.5rem] uppercase tracking-[0.16em] mb-5">Resumen</h2>

          <form
            className="flex gap-2 mb-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setCodeError(null);
              const result = await applyDiscount(code.trim());
              if (!result.ok) setCodeError(result.error ?? "Código no válido");
              else setCode("");
            }}
          >
            <input
              className="field"
              placeholder="Código descuento"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Código descuento"
            />
            <button className="button button--secondary" type="submit">Aplicar</button>
          </form>
          {codeError && <p className="text-[1.25rem] text-magenta -mt-3 mb-4">{codeError}</p>}
          {discount?.valid && <p className="text-[1.25rem] text-muted -mt-3 mb-4">{discount.description} aplicado ({discount.code})</p>}

          <dl className="flex flex-col gap-2 text-[1.4rem]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatMoney(subtotalCents)}</dd>
            </div>
            {discount?.valid && (
              <div className="flex justify-between text-magenta">
                <dt>Descuento</dt>
                <dd>−{formatMoney(discount.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd>{shipping ? (shipping.priceCents === 0 ? "Gratis" : formatMoney(shipping.priceCents)) : "—"}</dd>
            </div>
          </dl>

          <div className="flex justify-between border-t hairline mt-4 pt-4 text-[1.7rem] uppercase tracking-[0.1em]">
            <span>Total</span>
            <span>{formatMoney(totalCents)}</span>
          </div>

          <Link href="/checkout" className="button w-full mt-6">Finalizar compra</Link>

          {shipping && !shipping.freeApplied && (
            <p className="text-[1.25rem] text-muted mt-3 text-center">
              Te faltan {formatMoney(Math.max(0, subtotalCents - 7500))} para el envío gratis.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
