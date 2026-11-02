"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/admin/api-client";
import { formatMoney } from "@/lib/money";

// ── Utilidades de tabla ───────────────────────────────────────────────────────

export function SearchBar({ placeholder, path }: { placeholder: string; path: string }) {
  const [q, setQ] = useState("");
  return (
    <form
      className="flex gap-2 mb-4"
      action={path}
      method="get"
    >
      <input
        className="field max-w-[28rem]"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        name="q"
      />
      <button className="button button--secondary" type="submit">Buscar</button>
    </form>
  );
}

export function Pagination({ page, perPage, total, basePath }: { page: number; perPage: number; total: number; basePath: string }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-4 mt-4 text-[1.3rem]">
      {page > 1 && <Link className="underline" href={`${basePath}?page=${page - 1}`}>← Anterior</Link>}
      <span className="text-muted">Página {page} de {pages} · {total} resultados</span>
      {page < pages && <Link className="underline" href={`${basePath}?page=${page + 1}`}>Siguiente →</Link>}
    </div>
  );
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-muted",
  PAID: "text-volt-dark",
  PROCESSING: "text-volt-dark",
  SHIPPED: "text-ink",
  DELIVERED: "text-volt-dark",
  CANCELLED: "text-magenta",
  REFUNDED: "text-magenta",
  ACTIVE: "text-volt-dark",
  DRAFT: "text-muted",
  ARCHIVED: "text-magenta",
  REQUESTED: "text-muted",
  APPROVED: "text-volt-dark",
  REJECTED: "text-magenta",
  RECEIVED: "text-volt-dark",
  REFUNDED_ADMIN: "text-magenta",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[1.2rem] uppercase tracking-[0.08em] ${STATUS_COLORS[status] ?? ""}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Formulario de producto ────────────────────────────────────────────────────

type Variant = { id?: string; size: string; colorName: string; colorHex: string; stock: number; sku?: string };

export type ProductFormState = {
  name: string;
  slug: string;
  summary: string;
  description: string;
  details: string;
  price: string;
  compareAt: string;
  categoryId: string;
  featured: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  tags: string;
  images: string[];
  variants: Variant[];
};

export function emptyProductForm(): ProductFormState {
  return {
    name: "", slug: "", summary: "", description: "", details: "",
    price: "", compareAt: "", categoryId: "", featured: false, status: "DRAFT",
    tags: "", images: [], variants: [{ size: "M", colorName: "Negro", colorHex: "#141414", stock: 0 }],
  };
}

export function toPayload(form: ProductFormState) {
  return {
    name: form.name,
    slug: form.slug || undefined,
    summary: form.summary,
    description: form.description,
    details: form.details,
    priceCents: Math.round(parseFloat(form.price || "0") * 100),
    compareAtCents: form.compareAt ? Math.round(parseFloat(form.compareAt) * 100) : null,
    categoryId: form.categoryId || null,
    featured: form.featured,
    status: form.status,
    tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    images: form.images.map((url) => ({ url })),
    variants: form.variants.map((v) => ({
      id: v.id,
      size: v.size.trim(),
      colorName: v.colorName.trim(),
      colorHex: v.colorHex,
      stock: Number(v.stock) || 0,
      sku: v.sku || "",
    })),
  };
}

export function ProductEditor({
  initial,
  categories,
  onSubmit,
  submitLabel,
}: {
  initial: ProductFormState;
  categories: { id: string; name: string }[];
  onSubmit: (form: ProductFormState) => Promise<void>;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setVariant = (index: number, patch: Partial<Variant>) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-[80rem]">
      <div className="grid gap-x-5 md:grid-cols-2">
        <label className="block mb-4">
          <span className="label">Nombre *</span>
          <input className="field" required minLength={2} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="block mb-4">
          <span className="label">Slug (opcional)</span>
          <input className="field" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="se genera del nombre" />
        </label>
        <label className="block mb-4">
          <span className="label">Precio € *</span>
          <input className="field" required inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="49.90" />
        </label>
        <label className="block mb-4">
          <span className="label">Precio antes de descuento €</span>
          <input className="field" inputMode="decimal" value={form.compareAt} onChange={(e) => set("compareAt", e.target.value)} placeholder="59.90" />
        </label>
        <label className="block mb-4">
          <span className="label">Categoría</span>
          <select className="field" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block mb-4">
          <span className="label">Estado</span>
          <select className="field" value={form.status} onChange={(e) => set("status", e.target.value as ProductFormState["status"])}>
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activo</option>
            <option value="ARCHIVED">Archivado</option>
          </select>
        </label>
        <label className="block mb-4 md:col-span-2">
          <span className="label">Resumen</span>
          <input className="field" maxLength={300} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
        </label>
        <label className="block mb-4 md:col-span-2">
          <span className="label">Descripción</span>
          <textarea className="field" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className="block mb-4 md:col-span-2">
          <span className="label">Detalles y cuidados</span>
          <textarea className="field" rows={3} value={form.details} onChange={(e) => set("details", e.target.value)} />
        </label>
        <label className="block mb-4">
          <span className="label">Etiquetas (separadas por coma)</span>
          <input className="field" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="chandal, invierno" />
        </label>
        <label className="flex items-center gap-3 mb-4 mt-8 text-[1.4rem]">
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-5 h-5" />
          Destacado en portada
        </label>
      </div>

      {/* Imágenes */}
      <fieldset className="mb-6">
        <legend className="label">Imágenes (URL, una por línea)</legend>
        <textarea
          className="field"
          rows={4}
          value={form.images.join("\n")}
          onChange={(e) => set("images", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          placeholder="/img/products/chandal-invierno-burdeos--portada.png"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {form.images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="w-16 h-20 object-cover bg-wash border hairline" />
          ))}
        </div>
      </fieldset>

      {/* Variantes */}
      <fieldset className="mb-8">
        <legend className="label">Variantes (color + talla + stock)</legend>
        <div className="flex flex-col">
          {form.variants.map((variant, index) => (
            <div key={index} className="grid gap-2 grid-cols-[1fr_1fr_1fr_6rem_auto] items-end py-3 border-b hairline">
              <label className="block">
                <span className="text-[1.15rem] text-muted">Color</span>
                <input className="field py-2" required value={variant.colorName} onChange={(e) => setVariant(index, { colorName: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[1.15rem] text-muted">Hex</span>
                <input className="field py-2" required pattern="#[0-9a-fA-F]{6}" value={variant.colorHex} onChange={(e) => setVariant(index, { colorHex: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[1.15rem] text-muted">Talla</span>
                <input className="field py-2" required value={variant.size} onChange={(e) => setVariant(index, { size: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[1.15rem] text-muted">Stock</span>
                <input className="field py-2" required type="number" min={0} value={variant.stock} onChange={(e) => setVariant(index, { stock: Number(e.target.value) })} />
              </label>
              <button
                type="button"
                className="text-[1.3rem] underline text-muted py-2"
                onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }))}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="button button--secondary mt-3"
          onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, { size: "M", colorName: "Negro", colorHex: "#141414", stock: 0 }] }))}
        >
          + Añadir variante
        </button>
      </fieldset>

      {error && <p className="text-[1.4rem] text-magenta mb-4" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : submitLabel}</button>
    </form>
  );
}

// ── Formulario de categoría ───────────────────────────────────────────────────

export function CategoryEditor({
  initial,
  parents,
  onSubmit,
  submitLabel,
}: {
  initial: { name: string; slug: string; description: string; order: number; parentId: string };
  parents: { id: string; name: string }[];
  onSubmit: (form: { name: string; slug: string; description: string; order: number; parentId: string }) => Promise<void>;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-[48rem]">
      <label className="block mb-4">
        <span className="label">Nombre *</span>
        <input className="field" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </label>
      <label className="block mb-4">
        <span className="label">Slug (opcional)</span>
        <input className="field" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
      </label>
      <label className="block mb-4">
        <span className="label">Descripción</span>
        <textarea className="field" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </label>
      <label className="block mb-4">
        <span className="label">Orden</span>
        <input className="field" type="number" min={0} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))} />
      </label>
      <label className="block mb-6">
        <span className="label">Categoría padre</span>
        <select className="field" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
          <option value="">— Ninguna —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      {error && <p className="text-[1.4rem] text-magenta mb-4" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : submitLabel}</button>
    </form>
  );
}

export { api, formatMoney };
