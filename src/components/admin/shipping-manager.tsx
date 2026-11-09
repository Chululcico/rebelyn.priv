"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";

type ShippingConfig = {
  enabled: boolean;
  mode: "TARIFF_TABLE" | "API";
  origin: { name: string; address: string; city: string; province: string; postalCode: string; country: string };
  enabledServices: string[];
  volumetricDivisor: number;
  marginPercent: number;
  marginFixedCents: number;
  globalFreeShippingOverCents: number | null;
  tariffSourceLabel: "PUBLIC" | "CONTRACT" | "MIXED" | "MANUAL";
  correosClientId?: string;
  correosClientSecret?: string;
  correosCustomerNumber?: string;
  correosContractNumber?: string;
  correosLabellerCode?: string;
  apiVerified: boolean;
  notes?: string;
};

type Rate = {
  id: string;
  carrier: string;
  serviceCode: string;
  serviceName: string;
  zone: string;
  minGrams: number;
  maxGrams: number;
  basePriceCents: number;
  currency: string;
  source: string;
  deliveryType: string;
  estimatedDays?: string | null;
  active: boolean;
  notes?: string | null;
};

const SERVICES = ["PAQ_ESTANDAR", "PAQ_PREMIUM", "OFICINA", "CITYPAQ", "DOMICILIO"];
const ZONES = ["PENINSULA", "BALEARES", "CANARIAS", "CEUTA", "MELILLA", "ALL"];

const emptyRate = (): Omit<Rate, "id"> => ({
  carrier: "CORREOS",
  serviceCode: "PAQ_ESTANDAR",
  serviceName: "Paq Estándar",
  zone: "PENINSULA",
  minGrams: 0,
  maxGrams: 1000,
  basePriceCents: 490,
  currency: "EUR",
  source: "MANUAL",
  deliveryType: "DOMICILIO",
  estimatedDays: "48-72 h",
  active: true,
  notes: "",
});

export function ShippingManager() {
  const [config, setConfig] = useState<ShippingConfig | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newRate, setNewRate] = useState<Omit<Rate, "id">>(emptyRate());
  const [importJson, setImportJson] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        api<{ config: ShippingConfig }>("/api/admin/shipping/config"),
        api<{ rates: Rate[] }>("/api/admin/shipping/rates").catch(() => ({ rates: [] })),
      ]);
      setConfig(c.config);
      setRates(r.rates || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      await api("/api/admin/shipping/config", { method: "PATCH", body: JSON.stringify(config) });
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function addRate() {
    setError(null);
    try {
      await api("/api/admin/shipping/rates", { method: "POST", body: JSON.stringify(newRate) });
      setNewRate(emptyRate());
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al crear tarifa"); }
  }

  async function updateRate(id: string, patch: Partial<Rate>) {
    try {
      await api(`/api/admin/shipping/rates/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setRates((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar"); }
  }

  async function deleteRate(id: string) {
    if (!confirm("¿Eliminar esta tarifa?")) return;
    try {
      await api(`/api/admin/shipping/rates/${id}`, { method: "DELETE" });
      setRates((rs) => rs.filter((r) => r.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Error al eliminar"); }
  }

  async function importRates(replaceAll: boolean) {
    setError(null);
    try {
      const parsed = JSON.parse(importJson);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.import) ? parsed.import : null;
      if (!arr) throw new Error("El JSON debe ser un array de tarifas o { import: [...] }");
      await api("/api/admin/shipping/rates", { method: "POST", body: JSON.stringify({ import: arr, replaceAll }) });
      setImportJson("");
      await load();
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al importar"); }
  }

  if (loading) return <p className="text-muted">Cargando gestión de envíos…</p>;
  if (!config) return <p className="text-magenta">{error || "No se pudo cargar la configuración"}</p>;

  const set = <K extends keyof ShippingConfig>(k: K, v: ShippingConfig[K]) => setConfig((c) => (c ? { ...c, [k]: v } : c));
  const setOrigin = (k: keyof ShippingConfig["origin"], v: string) => setConfig((c) => (c ? { ...c, origin: { ...c.origin, [k]: v } } : c));

  return (
    <div className="max-w-[110rem]">
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-2">Gestión de envíos</h1>
      <p className="text-[1.3rem] text-muted mb-6">Integración Correos / tabla de tarifas configurable. Origen fijo: Elda (Alicante). Cobertura: España según disponibilidad y configuración.</p>

      <div className="border hairline bg-paper p-4 mb-6 text-[1.3rem]">
        <strong>Estado de integración Correos (API):</strong> no verificada/simulada por defecto. La integración oficial requiere acceso al Portal de Desarrolladores de Correos, credenciales (Correos ID/OAuth según servicio) y <strong>contrato de transporte</strong>. Solo se mostrarán/usarás servicios habilitados en tu configuración. Usa el modo <strong>Tabla de tarifas</strong> (importable/editable) mientras no tengas una API de cotización verificada para tu contrato.
      </div>

      <form onSubmit={saveConfig} className="border hairline bg-paper p-5 mb-8">
        <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-4">Configuración</h2>
        <div className="grid gap-x-5 md:grid-cols-2">
          <label className="flex items-center gap-3 mb-4 text-[1.4rem]"><input type="checkbox" className="w-5 h-5" checked={config.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Envíos habilitados</label>
          <label className="block mb-4"><span className="label">Modo</span>
            <select className="field" value={config.mode} onChange={(e) => set("mode", e.target.value as any)}>
              <option value="TARIFF_TABLE">Tabla de tarifas (recomendado sin API verificada)</option>
              <option value="API">API Correos (solo si verificada; no simula)</option>
            </select>
          </label>
          <label className="block mb-4"><span className="label">Origen - CP</span><input className="field" value={config.origin.postalCode} onChange={(e) => setOrigin("postalCode", e.target.value)} /></label>
          <label className="block mb-4"><span className="label">Origen - Ciudad</span><input className="field" value={config.origin.city} onChange={(e) => setOrigin("city", e.target.value)} /></label>
          <label className="block mb-4"><span className="label">Origen - Provincia</span><input className="field" value={config.origin.province} onChange={(e) => setOrigin("province", e.target.value)} /></label>
          <label className="block mb-4"><span className="label">Origen - Dirección</span><input className="field" value={config.origin.address} onChange={(e) => setOrigin("address", e.target.value)} /></label>
          <label className="block mb-4"><span className="label">Divisor peso volumétrico (cm³/kg factor)</span><input className="field" type="number" min={1000} value={config.volumetricDivisor} onChange={(e) => set("volumetricDivisor", Number(e.target.value))} /></label>
          <label className="block mb-4"><span className="label">Margen % sobre tarifa base</span><input className="field" type="number" min={0} step="0.01" value={config.marginPercent} onChange={(e) => set("marginPercent", Number(e.target.value))} /></label>
          <label className="block mb-4"><span className="label">Margen fijo (céntimos)</span><input className="field" type="number" min={0} value={config.marginFixedCents} onChange={(e) => set("marginFixedCents", Number(e.target.value))} /></label>
          <label className="block mb-4"><span className="label">Envío gratis desde (céntimos, vacío = no)</span><input className="field" value={config.globalFreeShippingOverCents ?? ""} onChange={(e) => set("globalFreeShippingOverCents", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label className="block mb-4"><span className="label">Origen tarifas</span>
            <select className="field" value={config.tariffSourceLabel} onChange={(e) => set("tariffSourceLabel", e.target.value as any)}>
              <option value="MANUAL">Manual</option><option value="PUBLIC">Públicas</option><option value="CONTRACT">Contratadas</option><option value="MIXED">Mixtas</option>
            </select>
          </label>
          <label className="block mb-4 md:col-span-2"><span className="label">Servicios habilitados (separados por coma)</span>
            <input className="field" value={config.enabledServices.join(", ")} onChange={(e) => set("enabledServices", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
            <span className="text-[1.15rem] text-muted">Ej: {SERVICES.join(", ")}. Investigar disponibilidad: Paq Estándar, Paq Premium, domicilio, oficina, Citypaq (solo los habilitados en tu contrato/config).</span>
          </label>
        </div>

        <details className="mb-4">
          <summary className="cursor-pointer text-[1.3rem] uppercase tracking-[0.08em]">Credenciales Correos (sensibles, servidor)</summary>
          <p className="text-[1.2rem] text-muted mt-2 mb-3">Recomendado: usar variables de entorno en Vercel para secretos. Si se guardan aquí, se almacenan en BD y solo deben gestionarse por admin. La cotización API no se ejecuta sin verificación real.</p>
          <div className="grid gap-x-5 md:grid-cols-2 mt-2">
            <label className="block mb-3"><span className="label">Client ID</span><input className="field" value={config.correosClientId || ""} onChange={(e) => set("correosClientId", e.target.value)} autoComplete="off" /></label>
            <label className="block mb-3"><span className="label">Client Secret</span><input className="field" type="password" value={config.correosClientSecret || ""} onChange={(e) => set("correosClientSecret", e.target.value)} autoComplete="new-password" /></label>
            <label className="block mb-3"><span className="label">Nº cliente</span><input className="field" value={config.correosCustomerNumber || ""} onChange={(e) => set("correosCustomerNumber", e.target.value)} /></label>
            <label className="block mb-3"><span className="label">Nº contrato</span><input className="field" value={config.correosContractNumber || ""} onChange={(e) => set("correosContractNumber", e.target.value)} /></label>
            <label className="block mb-3"><span className="label">Labeller code</span><input className="field" value={config.correosLabellerCode || ""} onChange={(e) => set("correosLabellerCode", e.target.value)} /></label>
            <label className="flex items-center gap-3 mb-3 text-[1.3rem]"><input type="checkbox" className="w-5 h-5" checked={config.apiVerified} onChange={(e) => set("apiVerified", e.target.checked)} /> API real verificada (solo si se ha probado con contrato/docs)</label>
          </div>
        </details>

        <label className="block mb-4"><span className="label">Notas</span><textarea className="field" rows={2} value={config.notes || ""} onChange={(e) => set("notes", e.target.value)} /></label>

        {error && <p className="text-[1.4rem] text-magenta mb-3" role="alert">{error}</p>}
        {saved && <p className="text-[1.4rem] text-volt-dark mb-3" role="status">Guardado.</p>}
        <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</button>
      </form>

      <section className="border hairline bg-paper p-5 mb-8">
        <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Tabla de tarifas (importable/editable)</h2>
        <p className="text-[1.25rem] text-muted mb-4">Define tarifas por servicio, zona y rango de peso (gramos facturables). El servidor usa peso real vs volumétrico. Diferencia origen: <code>source</code> PUBLIC/CONTRACT/MANUAL.</p>

        <div className="grid gap-2 md:grid-cols-4 mb-3 text-[1.2rem]">
          <label><span className="text-muted">Servicio</span><select className="field py-2" value={newRate.serviceCode} onChange={(e) => setNewRate((r) => ({ ...r, serviceCode: e.target.value }))}>{SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label><span className="text-muted">Nombre</span><input className="field py-2" value={newRate.serviceName} onChange={(e) => setNewRate((r) => ({ ...r, serviceName: e.target.value }))} /></label>
          <label><span className="text-muted">Zona</span><select className="field py-2" value={newRate.zone} onChange={(e) => setNewRate((r) => ({ ...r, zone: e.target.value }))}>{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></label>
          <label><span className="text-muted">Tipo entrega</span><select className="field py-2" value={newRate.deliveryType} onChange={(e) => setNewRate((r) => ({ ...r, deliveryType: e.target.value }))}><option value="DOMICILIO">DOMICILIO</option><option value="OFICINA">OFICINA</option><option value="CITYPAQ">CITYPAQ</option></select></label>
          <label><span className="text-muted">Min g</span><input className="field py-2" type="number" value={newRate.minGrams} onChange={(e) => setNewRate((r) => ({ ...r, minGrams: Number(e.target.value) }))} /></label>
          <label><span className="text-muted">Max g</span><input className="field py-2" type="number" value={newRate.maxGrams} onChange={(e) => setNewRate((r) => ({ ...r, maxGrams: Number(e.target.value) }))} /></label>
          <label><span className="text-muted">Precio base (céntimos)</span><input className="field py-2" type="number" value={newRate.basePriceCents} onChange={(e) => setNewRate((r) => ({ ...r, basePriceCents: Number(e.target.value) }))} /></label>
          <label><span className="text-muted">Plazo</span><input className="field py-2" value={newRate.estimatedDays || ""} onChange={(e) => setNewRate((r) => ({ ...r, estimatedDays: e.target.value }))} /></label>
          <label><span className="text-muted">Source</span><select className="field py-2" value={newRate.source} onChange={(e) => setNewRate((r) => ({ ...r, source: e.target.value }))}><option value="MANUAL">MANUAL</option><option value="PUBLIC">PUBLIC</option><option value="CONTRACT">CONTRACT</option></select></label>
        </div>
        <button type="button" className="button button--secondary mb-5" onClick={addRate}>+ Añadir tarifa</button>

        <details className="mb-4">
          <summary className="cursor-pointer text-[1.3rem]">Importar / exportar JSON</summary>
          <p className="text-[1.2rem] text-muted mt-2">Pega un array JSON de tarifas (campos como serviceCode, serviceName, zone, minGrams, maxGrams, basePriceCents, source, deliveryType, estimatedDays, active). Puedes exportar copiando el listado actual desde la API o adaptando tus tarifas públicas/contratadas.</p>
          <textarea className="field mt-2" rows={6} value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder='[{"carrier":"CORREOS","serviceCode":"PAQ_ESTANDAR","serviceName":"Paq Estándar","zone":"PENINSULA","minGrams":0,"maxGrams":1000,"basePriceCents":495,"source":"CONTRACT","deliveryType":"DOMICILIO","estimatedDays":"48-72 h","active":true}]' />
          <div className="flex gap-2 mt-2">
            <button type="button" className="button button--secondary" onClick={() => importRates(false)}>Importar (añadir)</button>
            <button type="button" className="button button--secondary" onClick={() => importRates(true)}>Importar (reemplazar todo el carrier)</button>
          </div>
        </details>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[1.25rem]">
            <thead><tr className="border-b hairline"><th className="p-2">Servicio</th><th className="p-2">Zona</th><th className="p-2">Peso (g)</th><th className="p-2">Base €</th><th className="p-2">Entrega</th><th className="p-2">Source</th><th className="p-2">Activa</th><th className="p-2" /></tr></thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-b hairline">
                  <td className="p-2">{r.serviceName}<div className="text-[1.1rem] text-muted">{r.serviceCode}</div></td>
                  <td className="p-2">{r.zone}</td>
                  <td className="p-2">{r.minGrams}–{r.maxGrams}</td>
                  <td className="p-2"><input className="field py-1 w-[10rem]" type="number" value={r.basePriceCents} onChange={(e) => updateRate(r.id, { basePriceCents: Number(e.target.value) })} /></td>
                  <td className="p-2">{r.deliveryType}{r.estimatedDays ? ` · ${r.estimatedDays}` : ""}</td>
                  <td className="p-2">{r.source}</td>
                  <td className="p-2"><input type="checkbox" checked={r.active} onChange={(e) => updateRate(r.id, { active: e.target.checked })} /></td>
                  <td className="p-2"><button type="button" className="underline text-muted" onClick={() => deleteRate(r.id)}>Eliminar</button></td>
                </tr>
              ))}
              {rates.length === 0 && <tr><td className="p-3 text-muted" colSpan={8}>No hay tarifas. Añade filas o importa un JSON. Si la tabla de BD no existe aún, ejecuta <code>prisma db push</code> (o migración) contra la base de datos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border hairline bg-paper p-5">
        <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-2">Seguimiento y pedidos</h2>
        <p className="text-[1.3rem] text-muted">La gestión operativa de pedidos y números de seguimiento se realiza en <a className="underline" href="/admin/orders">Pedidos</a>. El modelo de pedido ya soporta <code>trackingNumber</code>. La integración de seguimiento en tiempo real con Correos depende de las APIs/servicios disponibles en tu contrato y no se simula aquí.</p>
      </section>
    </div>
  );
}
