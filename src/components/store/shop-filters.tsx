"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

type Props = {
  categories: { slug: string; name: string }[];
  sizes: string[];
  colors: { slug: string; name: string; hex: string }[];
  total: number;
};

/** Filtros del catálogo. Cada cambio reescribe la URL (el servidor es quien filtra). */
export function ShopFilters({ categories, sizes, colors, total }: Props) {
  return (
    <Suspense fallback={null}>
      <FiltersInner categories={categories} sizes={sizes} colors={colors} total={total} />
    </Suspense>
  );
}

function FiltersInner({ categories, sizes, colors, total }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      next.delete("page");
      router.push(`/shop${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [router, searchParams],
  );

  const active = (key: string) => searchParams.get(key) ?? "";

  const chips = ["q", "category", "size", "color", "availability", "min", "max"]
    .map((key) => ({ key, value: active(key) }))
    .filter((c) => c.value);

  return (
    <div className="border-y hairline py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[1.3rem] uppercase tracking-[0.12em] text-muted">{total} prendas</span>

        <label className="flex items-center gap-2 text-[1.3rem]">
          <span className="sr-only">Categoría</span>
          <select className="field py-2 w-auto" value={active("category")} onChange={(e) => setParam("category", e.target.value)}>
            <option value="">Categoría: todas</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[1.3rem]">
          <span className="sr-only">Talla</span>
          <select className="field py-2 w-auto" value={active("size")} onChange={(e) => setParam("size", e.target.value)}>
            <option value="">Talla: todas</option>
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[1.3rem]">
          <span className="sr-only">Color</span>
          <select className="field py-2 w-auto" value={active("color")} onChange={(e) => setParam("color", e.target.value)}>
            <option value="">Color: todos</option>
            {colors.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[1.3rem]">
          <span className="sr-only">Disponibilidad</span>
          <select className="field py-2 w-auto" value={active("availability")} onChange={(e) => setParam("availability", e.target.value)}>
            <option value="">Disponibilidad: todas</option>
            <option value="in_stock">En stock</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-[1.3rem]">
          <span className="sr-only">Ordenar</span>
          <select className="field py-2 w-auto" value={active("sort") || "newest"} onChange={(e) => setParam("sort", e.target.value)}>
            <option value="newest">Novedades</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
            <option value="name">Nombre A–Z</option>
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="px-3 py-1 border hairline text-[1.25rem] hover:border-ink"
              onClick={() => setParam(chip.key, null)}
            >
              {chip.key === "q" ? `“${chip.value}”` : chip.value} ✕
            </button>
          ))}
          <button type="button" className="px-3 py-1 text-[1.25rem] underline text-muted" onClick={() => router.push("/shop")}>
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
}
