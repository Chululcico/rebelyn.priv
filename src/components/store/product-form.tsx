"use client";

import { useMemo, useState } from "react";
import { useCart } from "./cart-context";

type ColorGroup = {
  name: string;
  hex: string;
  variants: { id: string; size: string; stock: number }[];
};

type Props = {
  productId: string;
  colors: ColorGroup[];
  onSale: boolean;
  priceCents: number;
};

/** Selector de color/talla, cantidad, añadir al carrito y comprar ahora. */
export function ProductForm({ colors, productId }: Props) {
  const { add, openDrawer } = useCart();
  const [colorIndex, setColorIndex] = useState(() => colors.findIndex((c) => c.variants.some((v) => v.stock > 0)));
  const activeColor = colors[colorIndex >= 0 ? colorIndex : 0];

  const [size, setSize] = useState<string | null>(() => {
    const group = colors[colorIndex >= 0 ? colorIndex : 0];
    return group?.variants.find((v) => v.stock > 0)?.size ?? null;
  });
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [buying, setBuying] = useState(false);

  const selectedVariant = useMemo(
    () => activeColor?.variants.find((v) => v.size === size) ?? null,
    [activeColor, size],
  );

  function selectColor(index: number) {
    setColorIndex(index);
    const firstAvailable = colors[index]?.variants.find((v) => v.stock > 0);
    setSize(firstAvailable?.size ?? null);
    setNote(null);
  }

  async function handleAdd(goCheckout: boolean) {
    if (!selectedVariant || selectedVariant.stock <= 0) {
      setNote({ ok: false, text: "Elige una talla disponible" });
      return;
    }
    setBuying(true);
    const result = await add(selectedVariant.id, qty);
    setNote({ ok: result.ok, text: result.message });
    setBuying(false);
    if (result.ok && goCheckout) {
      window.location.href = "/checkout";
    } else if (result.ok) {
      openDrawer();
    }
  }

  if (!colors.length) {
    return <p className="mt-6 text-[1.4rem] text-muted">Producto no disponible.</p>;
  }

  const maxQty = Math.min(selectedVariant?.stock ?? 0, 10);

  return (
    <div className="mt-8">
      {/* Color */}
      {colors.length > 1 && (
        <div className="mb-5">
          <p className="label">Color · {activeColor?.name}</p>
          <div className="flex flex-wrap gap-3">
            {colors.map((color, index) => (
              <button
                key={color.name}
                type="button"
                aria-label={color.name}
                aria-pressed={index === colorIndex}
                onClick={() => selectColor(index)}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
                  index === colorIndex ? "border-ink" : "border-transparent"
                }`}
              >
                <span className="swatch w-6 h-6" style={{ background: color.hex }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Talla */}
      <fieldset className="mb-5">
        <legend className="label">Talla{selectedVariant ? "" : " · elige una"}</legend>
        <div className="flex flex-wrap gap-2">
          {activeColor?.variants.map((variant) => (
            <span key={variant.id} className="size-pill">
              <input
                type="radio"
                id={`size-${productId}-${variant.id}`}
                name={`size-${productId}`}
                value={variant.size}
                checked={size === variant.size}
                disabled={variant.stock <= 0}
                onChange={() => {
                  setSize(variant.size);
                  setNote(null);
                }}
              />
              <label htmlFor={`size-${productId}-${variant.id}`}>
                {variant.size}
                {variant.stock <= 0 && <span className="sr-only"> — agotada</span>}
              </label>
            </span>
          ))}
        </div>
        {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
          <p className="text-[1.25rem] text-magenta mt-2">¡Solo quedan {selectedVariant.stock}!</p>
        )}
      </fieldset>

      {/* Cantidad */}
      <div className="mb-6">
        <p className="label">Cantidad</p>
        <div className="qty">
          <button type="button" aria-label="Restar" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span>{qty}</span>
          <button type="button" aria-label="Sumar" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
        </div>
      </div>

      {/* Acciones */}
      <button className="button w-full" type="button" disabled={buying || !selectedVariant} onClick={() => handleAdd(false)}>
        {selectedVariant && selectedVariant.stock <= 0 ? "Agotado" : "Añadir al carrito"}
      </button>
      <button className="button button--secondary w-full mt-3" type="button" disabled={buying || !selectedVariant} onClick={() => handleAdd(true)}>
        Comprar ahora
      </button>

      {note && (
        <p className={`text-[1.3rem] mt-3 ${note.ok ? "text-muted" : "text-magenta"}`} role="status">
          {note.text}
        </p>
      )}

      <p className="text-[1.25rem] text-muted mt-4">
        Envío estándar 4,90 € · gratis desde 75 € · Devolución en 30 días
      </p>
    </div>
  );
}
