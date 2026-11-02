"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-context";

/** Carrito lateral. Muestra líneas, subtotal y acceso al checkout. */
export function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, subtotalCents, count, setQty, remove } = useCart();

  if (!drawerOpen) return null;

  return (
    <div className="drawer" data-open="true" role="dialog" aria-modal="true" aria-label="Carrito">
      <button className="drawer__backdrop" aria-label="Cerrar carrito" onClick={closeDrawer} />
      <div className="drawer__panel">
        <div className="flex items-center justify-between p-5 border-b hairline">
          <h2 className="text-[1.5rem] uppercase tracking-[0.16em]">Tu carrito ({count})</h2>
          <button type="button" aria-label="Cerrar carrito" onClick={closeDrawer}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {lines.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[1.5rem] mb-6">Tu carrito está vacío.</p>
              <Link href="/shop" className="button" onClick={closeDrawer}>
                Ver catálogo
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-6">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-4">
                  <Link href={`/product/${line.slug}`} onClick={closeDrawer} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={line.image ?? ""} alt={line.name} width={80} height={106} className="w-20 h-[10.6rem] object-cover bg-wash" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <Link href={`/product/${line.slug}`} onClick={closeDrawer} className="text-[1.4rem] leading-snug">
                        {line.name}
                      </Link>
                      <span className="text-[1.4rem] whitespace-nowrap">{formatMoney(line.totalCents)}</span>
                    </div>
                    <p className="text-[1.25rem] text-muted mt-1 flex items-center gap-2">
                      {line.colorHex && <span className="swatch" style={{ background: line.colorHex }} />}
                      {line.colorName ? `${line.colorName} · ` : ""}Talla {line.size}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="qty">
                        <button type="button" aria-label="Restar" onClick={() => setQty(line.id, line.qty - 1)}>−</button>
                        <span>{line.qty}</span>
                        <button type="button" aria-label="Sumar" disabled={line.qty >= Math.min(line.maxStock, 10)} onClick={() => setQty(line.id, line.qty + 1)}>+</button>
                      </div>
                      <button type="button" className="text-[1.25rem] underline text-muted" onClick={() => remove(line.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t hairline p-5">
            <div className="flex justify-between text-[1.4rem] uppercase tracking-[0.1em]">
              <span>Subtotal</span>
              <span>{formatMoney(subtotalCents)}</span>
            </div>
            <p className="text-[1.2rem] text-muted mt-1">Envío e impuestos se calculan en el checkout.</p>
            <Link href="/checkout" className="button w-full mt-4" onClick={closeDrawer}>
              Finalizar compra
            </Link>
            <Link href="/cart" className="block text-center text-[1.3rem] underline mt-3 text-muted" onClick={closeDrawer}>
              Ver carrito
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
