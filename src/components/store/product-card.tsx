"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney, isOnSale, percentOff } from "@/lib/money";
import { useCart } from "./cart-context";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtCents: number | null;
  image: string | null;
  hoverImage: string | null;
  soldOut: boolean;
  sizes: { size: string; inStock: boolean }[];
  variantOptions: { id: string; size: string; colorSlug: string | null; stock: number }[];
};

/** Tarjeta de producto con imagen secundaria al pasar el ratón y añadir rápido por talla. */
export function ProductCard({ product }: { product: ProductCardData }) {
  const { add, openDrawer } = useCart();
  const [note, setNote] = useState<string | null>(null);
  const onSale = isOnSale(product.priceCents, product.compareAtCents);

  // Un botón por talla: si hay varios colores, se añade el primero con stock.
  const sizeButtons = product.sizes.map(({ size }) => {
    const variants = product.variantOptions.filter((v) => v.size === size);
    const available = variants.find((v) => v.stock > 0);
    return { size, variantId: available?.id ?? variants[0]?.id ?? "", inStock: Boolean(available) };
  });

  async function quickAdd(variantId: string) {
    setNote(null);
    const result = await add(variantId, 1);
    setNote(result.message);
    if (result.ok) openDrawer();
  }

  return (
    <div className="card group fade-in">
      <div className="card__media">
        <Link href={`/product/${product.slug}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image ?? ""} alt={product.name} loading="lazy" decoding="async" />
          {product.hoverImage && product.hoverImage !== product.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={product.hoverImage} alt="" loading="lazy" decoding="async" />
          )}
        </Link>

        {onSale && <span className="card__badge">Oferta</span>}
        {product.soldOut && (
          <span className="absolute inset-0 z-[2] flex items-center justify-center bg-white/60 text-[1.3rem] uppercase tracking-[0.2em]">
            Agotado
          </span>
        )}

        {!product.soldOut && product.variantOptions.length > 0 && (
          <div className="quick-add">
            {sizeButtons.map(({ size, variantId, inStock }) => (
              <button
                key={size}
                type="button"
                disabled={!inStock}
                aria-label={`Añadir talla ${size}`}
                onClick={() => quickAdd(variantId)}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3">
        <h3 className="text-[1.35rem] leading-tight">
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="text-[1.3rem] mt-1">
          {onSale ? (
            <>
              <span>{formatMoney(product.priceCents)}</span>{" "}
              <s className="text-muted ml-1">{formatMoney(product.compareAtCents!)}</s>{" "}
              <span className="text-magenta">-{percentOff(product.priceCents, product.compareAtCents)}%</span>
            </>
          ) : (
            formatMoney(product.priceCents)
          )}
        </p>
        {note && <p className="text-[1.15rem] text-muted mt-1" role="status">{note}</p>}
      </div>
    </div>
  );
}
