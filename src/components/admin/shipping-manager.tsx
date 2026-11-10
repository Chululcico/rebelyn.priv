"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";
import { formatMoney } from "@/lib/money";

type Method = {
  id: string;
  name: string;
  priceCents: number;
  freeOverCents: number | null;
  estimatedDays: string;
  active: boolean;
};

/** Convierte "4,90" o "4.90" → 490 céntimos. Devuelve null si no es válido. */
function parseEuros(value: string): number | null {
  const n = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0 || n > 999) return null;
  return Math.round(n * 100);
}

export function ShippingManager() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [standard, setStandard] = useState("");
  const [express, setExpress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ methods: Method[] }>("/api/admin/shipping/methods");
      setMethods(data.methods);
      const std = data.methods.find((m) => m.id === "standard");
      const exp = data.methods.find((m) => m.id === "express");
      setStandard(((std?.priceCents ?? 0) / 100).toFixed(2));
      setExpress(((exp?.priceCents ?? 0) / 100).toFixed(2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los precios de envío");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const std = parseEuros(standard);
    const exp = parseEuros(express);
    if (std == null || exp == null) {
      setError("Escribe precios válidos en euros, por ejemplo 4,90 (máximo 999 €).");
      setSaving(false);
      return;
    }
    try {
      await api("/api/admin/shipping/methods", {
        method: "PATCH",
        body: JSON.stringify({ standardPriceCents: std, expressPriceCents: exp }),
      });
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted">Cargando precios de envío…</p>;

  const std = methods.find((m) => m.id === "standard");
  const exp = methods.find((m) => m.id === "express");

  return (
    <div className="max-w-[64rem]">
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-2">Gestión de envíos</h1>
      <p className="text-[1.3rem] text-muted mb-6">
        Dos métodos de envío con <strong>precio fijo</strong> para toda España. Lo que guardes aquí es
        exactamente lo que verá el cliente en el checkout.
      </p>

      <form onSubmit={save} className="border hairline bg-paper p-5">
        <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-4">Precios de envío</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">{std?.name ?? "Envío estándar"} · precio (€)</span>
            <input
              className="field"
              inputMode="decimal"
              required
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              placeholder="4,90"
            />
            {std?.estimatedDays && <span className="block text-[1.2rem] text-muted mt-2">Plazo: {std.estimatedDays}</span>}
            {std?.freeOverCents != null && (
              <span className="block text-[1.2rem] text-muted mt-1">
                Gratis a partir de {formatMoney(std.freeOverCents)} de compra (se aplica solo).
              </span>
            )}
          </label>
          <label className="block">
            <span className="label">{exp?.name ?? "Envío express"} · precio (€)</span>
            <input
              className="field"
              inputMode="decimal"
              required
              value={express}
              onChange={(e) => setExpress(e.target.value)}
              placeholder="8,90"
            />
            {exp?.estimatedDays && <span className="block text-[1.2rem] text-muted mt-2">Plazo: {exp.estimatedDays}</span>}
          </label>
        </div>

        {error && <p className="text-[1.4rem] text-magenta mt-4" role="alert">{error}</p>}
        {saved && <p className="text-[1.4rem] text-volt-dark mt-4" role="status">Guardado. El checkout ya usa estos precios.</p>}

        <button className="button mt-5" type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar precios"}
        </button>
      </form>

      <div className="border hairline bg-paper p-5 mt-6 text-[1.3rem]">
        <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mb-3">Cómo funciona</h2>
        <ul className="flex flex-col gap-2 list-disc pl-6 text-muted">
          <li>El precio es fijo para cualquier destino de España, sin importar el peso.</li>
          <li>El cliente elige entre Estándar y Express en el checkout; el precio se valida en servidor.</li>
          <li>
            Opciones avanzadas (nombres, plazos, envío gratis desde, activar/desactivar métodos) están en{" "}
            <a className="underline" href="/admin/settings">Ajustes → Métodos de envío</a>.
          </li>
        </ul>
      </div>
    </div>
  );
}
