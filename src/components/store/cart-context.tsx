"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  size: string;
  colorName: string | null;
  colorHex: string | null;
  unitPriceCents: number;
  compareAtCents: number | null;
  qty: number;
  totalCents: number;
  maxStock: number;
};

type CartState = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  totalCents: number;
  shipping: { priceCents: number; freeApplied: boolean; name: string; estimatedDays: string } | null;
  discount: { valid: true; code: string; discountCents: number; description: string } | { valid: false; reason: string } | null;
  loading: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
  add: (variantId: string, qty?: number) => Promise<{ ok: boolean; message: string }>;
  setQty: (itemId: string, qty: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<{ ok: boolean; error?: string }>;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [totalCents, setTotalCents] = useState(0);
  const [shipping, setShipping] = useState<CartState["shipping"]>(null);
  const [discount, setDiscount] = useState<CartState["discount"]>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setLines(data.lines ?? []);
      setSubtotalCents(data.subtotalCents ?? 0);
      setTotalCents(data.totalCents ?? 0);
      setShipping(data.shipping ?? null);
      setDiscount(data.discount ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (variantId: string, qty = 1) => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, qty }),
      });
      const data = await res.json().catch(() => ({}));
      await refresh();
      return { ok: Boolean(data.ok), message: data.message ?? data.error ?? "Error" };
    },
    [refresh],
  );

  const setQty = useCallback(
    async (itemId: string, qty: number) => {
      await fetch("/api/cart/item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, qty }),
      });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (itemId: string) => {
      await fetch("/api/cart/item", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      await refresh();
    },
    [refresh],
  );

  const applyDiscount = useCallback(
    async (code: string) => {
      const res = await fetch("/api/cart/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      await refresh();
      return res.ok ? { ok: true } : { ok: false, error: data.error ?? "Código no válido" };
    },
    [refresh],
  );

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      subtotalCents,
      totalCents,
      shipping,
      discount,
      loading,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      refresh,
      add,
      setQty,
      remove,
      applyDiscount,
    }),
    [lines, subtotalCents, totalCents, shipping, discount, loading, drawerOpen, refresh, add, setQty, remove, applyDiscount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
