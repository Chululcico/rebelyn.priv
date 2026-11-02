"use client";

import { useCallback, useEffect, useState } from "react";

type Address = {
  id: string;
  name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const EMPTY = { name: "", phone: "", line1: "", line2: "", city: "", province: "", postalCode: "", country: "ES" };

export function AddressesManager({ initial }: { initial: Address[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/account/addresses");
    const data = await res.json();
    if (res.ok) setAddresses(data.addresses);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(
      editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "No hemos podido guardar la dirección.");
      return;
    }
    setForm(EMPTY);
    setEditingId(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta dirección?")) return;
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) await load();
  }

  const field = (key: keyof typeof EMPTY, label: string, extra: Record<string, string | number | undefined> = {}) => (
    <label className="block mb-4">
      <span className="label">{label}</span>
      <input
        className="field"
        required={["name", "line1", "city", "province", "postalCode"].includes(key)}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        {...extra}
      />
    </label>
  );

  return (
    <div>
      <h2 className="text-[1.8rem] uppercase tracking-[0.14em] mb-6">Direcciones</h2>

      <ul className="border-t hairline mb-8">
        {addresses.length === 0 && <li className="py-4 text-[1.35rem] text-muted border-b hairline">Sin direcciones guardadas.</li>}
        {addresses.map((address) => (
          <li key={address.id} className="py-4 border-b hairline flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-[1.4rem]">
                {address.name} {address.isDefault && <span className="text-[1.15rem] border hairline px-2 py-0.5 ml-2">Predeterminada</span>}
              </p>
              <p className="text-[1.25rem] text-muted">
                {address.line1}{address.line2 ? `, ${address.line2}` : ""} · {address.postalCode} {address.city} ({address.province})
              </p>
              {address.phone && <p className="text-[1.2rem] text-muted">{address.phone}</p>}
            </div>
            <div className="flex items-start gap-4 text-[1.3rem]">
              {!address.isDefault && (
                <button type="button" className="underline" onClick={() => setDefault(address.id)}>Predeterminada</button>
              )}
              <button type="button" className="underline" onClick={() => { setForm({ name: address.name, phone: address.phone ?? "", line1: address.line1, line2: address.line2 ?? "", city: address.city, province: address.province, postalCode: address.postalCode, country: address.country }); setEditingId(address.id); }}>
                Editar
              </button>
              <button type="button" className="underline text-muted" onClick={() => remove(address.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={save} className="border hairline p-6 max-w-[52rem]">
        <h3 className="text-[1.4rem] uppercase tracking-[0.12em] mb-4">{editingId ? "Editar dirección" : "Nueva dirección"}</h3>
        <div className="grid gap-x-4 md:grid-cols-2">
          {field("name", "Nombre y apellidos", { autoComplete: "name" })}
          {field("phone", "Teléfono (opcional)", { autoComplete: "tel" })}
          {field("line1", "Dirección", { autoComplete: "address-line1" })}
          {field("line2", "Piso, puerta… (opcional)", { autoComplete: "address-line2" })}
          {field("postalCode", "Código postal", { pattern: "[0-9]{5}", inputMode: "numeric" })}
          {field("city", "Ciudad", { autoComplete: "address-level2" })}
          {field("province", "Provincia", { autoComplete: "address-level1" })}
          {field("country", "País (ISO, 2 letras)", { maxLength: 2 })}
        </div>
        {error && <p className="text-[1.3rem] text-magenta mb-3" role="alert">{error}</p>}
        <div className="flex gap-3">
          <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
          {editingId && (
            <button className="button button--secondary" type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
