"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";

type ShippingMethod = { id: string; name: string; priceCents: number; freeOverCents: number | null; estimatedDays: string; active: boolean };
type Settings = {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  legalName: string;
  legalId: string;
  currency: string;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  orderEmail: { subject: string; message: string };
  social: { instagram?: string; tiktok?: string; whatsapp?: string };
  shippingMethods: ShippingMethod[];
};

export function SettingsManager() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/settings").then((d) => setSettings(d.settings)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-[1.4rem] text-magenta">{error}</p>;
  if (!settings) return <p className="text-muted">Cargando ajustes…</p>;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => (s ? { ...s, [key]: value } : s));
  const setMethod = (index: number, patch: Partial<ShippingMethod>) =>
    setSettings((s) => (s ? { ...s, shippingMethods: s.shippingMethods.map((m, i) => (i === index ? { ...m, ...patch } : m)) } : s));

  async function resetStore() {
    setResetError(null);
    setResetResult(null);

    const confirmed = window.confirm(
      "¿SEGURO? Se borrarán TODOS los pedidos, productos, clientes, descuentos, devoluciones y mensajes.\n\nNo se puede deshacer. Se mantienen tu cuenta de administrador y los ajustes de la tienda.",
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await api<{ ok: boolean; deleted: { orders: number; products: number; customers: number } }>("/api/admin/reset", {
        method: "POST",
        body: JSON.stringify({ code: resetCode.trim() }),
      });
      setResetResult(
        `Borrado completado: ${res.deleted.orders} pedidos, ${res.deleted.products} productos y ${res.deleted.customers} clientes.`,
      );
      setResetCode("");
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "No se pudo borrar los datos.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-6">Ajustes de la tienda</h1>
      <form onSubmit={save} className="max-w-[80rem]">
        <div className="grid gap-x-5 md:grid-cols-2 border hairline bg-paper p-5 mb-6">
          <label className="block mb-4"><span className="label">Nombre de la tienda</span>
            <input className="field" required value={settings.storeName} onChange={(e) => set("storeName", e.target.value)} />
          </label>
          <label className="block mb-4"><span className="label">Email de contacto</span>
            <input className="field" type="email" required value={settings.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </label>
          <label className="block mb-4"><span className="label">Teléfono</span>
            <input className="field" value={settings.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          </label>
          <label className="block mb-4"><span className="label">Dirección fiscal</span>
            <input className="field" value={settings.address} onChange={(e) => set("address", e.target.value)} />
          </label>
          <label className="block mb-4"><span className="label">Nombre legal</span>
            <input className="field" value={settings.legalName} onChange={(e) => set("legalName", e.target.value)} />
          </label>
          <label className="block mb-4"><span className="label">NIF/CIF</span>
            <input className="field" value={settings.legalId} onChange={(e) => set("legalId", e.target.value)} />
          </label>
          <label className="block mb-4"><span className="label">Instagram</span>
            <input className="field" value={settings.social.instagram ?? ""} onChange={(e) => set("social", { ...settings.social, instagram: e.target.value })} />
          </label>
          <label className="block mb-4"><span className="label">TikTok</span>
            <input className="field" value={settings.social.tiktok ?? ""} onChange={(e) => set("social", { ...settings.social, tiktok: e.target.value })} />
          </label>
        </div>

        <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Métodos de envío</h2>
        <div className="border hairline bg-paper p-5 mb-6">
          {settings.shippingMethods.map((method, index) => (
            <div key={method.id} className="grid gap-3 grid-cols-[1fr_1fr_1fr_1fr_auto] items-end py-3 border-b hairline last:border-0">
              <label className="block"><span className="text-[1.15rem] text-muted">Nombre</span>
                <input className="field py-2" value={method.name} onChange={(e) => setMethod(index, { name: e.target.value })} />
              </label>
              <label className="block"><span className="text-[1.15rem] text-muted">Precio €</span>
                <input className="field py-2" inputMode="decimal" value={(method.priceCents / 100).toFixed(2)} onChange={(e) => setMethod(index, { priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </label>
              <label className="block"><span className="text-[1.15rem] text-muted">Gratis desde € (vacío = nunca)</span>
                <input className="field py-2" inputMode="decimal" value={method.freeOverCents != null ? (method.freeOverCents / 100).toFixed(2) : ""} onChange={(e) => setMethod(index, { freeOverCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} />
              </label>
              <label className="block"><span className="text-[1.15rem] text-muted">Plazo</span>
                <input className="field py-2" value={method.estimatedDays} onChange={(e) => setMethod(index, { estimatedDays: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-[1.3rem] pb-2">
                <input type="checkbox" checked={method.active} onChange={(e) => setMethod(index, { active: e.target.checked })} className="w-5 h-5" />
                Activo
              </label>
            </div>
          ))}
          <button
            type="button"
            className="button button--secondary mt-3"
            onClick={() =>
              setSettings((s) =>
                s
                  ? {
                      ...s,
                      shippingMethods: [
                        ...s.shippingMethods,
                        { id: `custom-${Date.now()}`, name: "Envío nuevo", priceCents: 490, freeOverCents: 7500, estimatedDays: "2–4 días", active: true },
                      ],
                    }
                  : s,
              )
            }
          >
            + Añadir método
          </button>
        </div>

        <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Email de pedido confirmado</h2>
        <div className="border hairline bg-paper p-5 mb-6">
          <label className="block mb-4"><span className="label">Asunto</span>
            <input className="field" value={settings.orderEmail.subject} onChange={(e) => set("orderEmail", { ...settings.orderEmail, subject: e.target.value })} />
          </label>
          <label className="block"><span className="label">Mensaje para el cliente</span>
            <textarea className="field" rows={5} value={settings.orderEmail.message} onChange={(e) => set("orderEmail", { ...settings.orderEmail, message: e.target.value })} />
          </label>
          <p className="text-[1.2rem] text-muted mt-3">
            Usa {"{orderNumber}"} para el número de pedido y {"{nombre}"} para el nombre del cliente. El email añade automáticamente el desglose del pedido y la dirección de envío.
          </p>
        </div>

        {error && <p className="text-[1.4rem] text-magenta mb-4" role="alert">{error}</p>}
        {saved && <p className="text-[1.4rem] text-volt-dark mb-4" role="status">Ajustes guardados.</p>}
        <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar ajustes"}</button>
      </form>

      {/* Zona de peligro: borrado total protegido por código. */}
      <section className="mt-16 max-w-[80rem] border-2 border-magenta/40 bg-magenta/[0.03] p-5 rounded-lg">
        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] text-magenta">Zona de peligro</h2>
        <p className="text-[1.3rem] text-muted mt-2 mb-4">
          Borra <strong>todos los datos</strong> de la tienda: pedidos, productos, categorías, variantes, stock,
          clientes, direcciones, descuentos, devoluciones, mensajes y suscriptores. Se mantienen tu cuenta de
          administrador y los ajustes de la tienda (envíos, email, datos fiscales). <strong>No se puede deshacer.</strong>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="block flex-1 max-w-[26rem]">
            <span className="label">Código de seguridad</span>
            <input
              className="field"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Introduce el código"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={resetStore}
            disabled={resetting || resetCode.trim().length === 0}
            className="button !bg-magenta !text-white disabled:opacity-50"
          >
            {resetting ? "Borrando…" : "Borrar todos los datos"}
          </button>
        </div>
        {resetError && <p className="text-[1.35rem] text-magenta mt-3" role="alert">{resetError}</p>}
        {resetResult && <p className="text-[1.35rem] text-volt-dark mt-3" role="status">{resetResult}</p>}
      </section>
    </div>
  );
}
