"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";
import { formatMoney } from "@/lib/money";
import { CategoryEditor, StatusBadge } from "./shared";

// ── Categorías ────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; slug: string; description: string | null; order: number; parentId: string | null; _count: { products: number } };

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<{ categories: Category[] }>("/api/admin/categories").then((d) => setCategories(d.categories)).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);

  async function save(form: { name: string; slug: string; description: string; order: number; parentId: string }) {
    const body = JSON.stringify({ ...form, slug: form.slug || undefined, description: form.description || undefined, parentId: form.parentId || null });
    if (editing === "new") await api("/api/admin/categories", { method: "POST", body });
    else if (editing) await api(`/api/admin/categories/${editing.id}`, { method: "PATCH", body });
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await api(`/api/admin/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-[2.2rem] uppercase tracking-[0.12em]">Categorías</h1>
        <button className="button" type="button" onClick={() => setEditing("new")}>+ Nueva</button>
      </div>
      {error && <p className="text-[1.35rem] text-magenta mb-4">{error}</p>}
      {editing ? (
        <div className="border hairline bg-paper p-5 mb-6">
          <CategoryEditor
            initial={editing === "new" ? { name: "", slug: "", description: "", order: 0, parentId: "" } : { name: editing.name, slug: editing.slug, description: editing.description ?? "", order: editing.order, parentId: editing.parentId ?? "" }}
            parents={categories.filter((c) => c.id !== (editing !== "new" ? editing.id : ""))}
            onSubmit={save}
            submitLabel={editing === "new" ? "Crear" : "Guardar"}
          />
          <button className="text-[1.3rem] underline text-muted mt-4" type="button" onClick={() => setEditing(null)}>Cancelar</button>
        </div>
      ) : null}
      <ul className="border-t hairline bg-paper">
        {categories.map((category) => (
          <li key={category.id} className="flex flex-wrap justify-between gap-3 py-3 px-3 border-b hairline last:border-0">
            <span className="text-[1.35rem]">
              {category.name}
              <span className="block text-[1.1rem] text-muted">/{category.slug} · {category._count.products} productos · orden {category.order}</span>
            </span>
            <span className="flex gap-4 text-[1.3rem]">
              <button type="button" className="underline" onClick={() => setEditing(category)}>Editar</button>
              <button type="button" className="underline text-muted" onClick={() => remove(category.id)}>Eliminar</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Descuentos ────────────────────────────────────────────────────────────────

type Discount = { id: string; code: string; type: string; value: number; active: boolean; usedCount: number; maxUses: number | null; minOrderCents: number; endsAt: string | null; _count: { usages: number } };

export function DiscountsManager() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [form, setForm] = useState({ code: "", type: "PERCENTAGE", value: "", minOrder: "", maxUses: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api<{ discounts: Discount[] }>("/api/admin/discounts").then((d) => setDiscounts(d.discounts)).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/admin/discounts", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          minOrderCents: Math.round(parseFloat(form.minOrder || "0") * 100),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
        }),
      });
      setForm({ code: "", type: "PERCENTAGE", value: "", minOrder: "", maxUses: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(discount: Discount) {
    await api(`/api/admin/discounts/${discount.id}`, { method: "PATCH", body: JSON.stringify({ active: !discount.active }) });
    await load();
  }

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-5">Descuentos</h1>
      {error && <p className="text-[1.35rem] text-magenta mb-4">{error}</p>}
      <form onSubmit={create} className="border hairline bg-paper p-5 mb-6 grid gap-3 sm:grid-cols-5 items-end">
        <label className="block"><span className="label">Código</span>
          <input className="field py-2" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        </label>
        <label className="block"><span className="label">Tipo</span>
          <select className="field py-2" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="PERCENTAGE">%</option>
            <option value="FIXED">€ fijo</option>
          </select>
        </label>
        <label className="block"><span className="label">Valor</span>
          <input className="field py-2" required type="number" min={1} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
        </label>
        <label className="block"><span className="label">Pedido mín. €</span>
          <input className="field py-2" inputMode="decimal" value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} />
        </label>
        <button className="button" type="submit" disabled={saving}>{saving ? "Creando…" : "Crear"}</button>
      </form>
      <ul className="border-t hairline bg-paper">
        {discounts.map((discount) => (
          <li key={discount.id} className="flex flex-wrap justify-between gap-3 py-3 px-3 border-b hairline last:border-0 text-[1.3rem]">
            <span>
              <strong>{discount.code}</strong> · {discount.type === "PERCENTAGE" ? `${discount.value}%` : formatMoney(discount.value)}
              {discount.minOrderCents > 0 && <span className="text-muted"> · mín {formatMoney(discount.minOrderCents)}</span>}
            </span>
            <span className="text-muted">{discount.usedCount} usos{discount.maxUses ? ` / ${discount.maxUses}` : ""}</span>
            <button type="button" className={`underline ${discount.active ? "" : "text-muted"}`} onClick={() => toggle(discount)}>
              {discount.active ? "Activo" : "Inactivo"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Clientes ──────────────────────────────────────────────────────────────────

type Customer = { id: string; email: string; name: string | null; phone: string | null; role: string; createdAt: string; totalSpentCents: number; _count: { orders: number } };

export function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ customers: Customer[] }>("/api/admin/customers").then((d) => setCustomers(d.customers)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-[1.35rem] text-magenta">{error}</p>;

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-5">Clientes</h1>
      <div className="overflow-x-auto border hairline bg-paper">
        <table className="w-full text-left text-[1.3rem]">
          <thead>
            <tr className="border-b hairline">
              <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Email</th>
              <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Nombre</th>
              <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Pedidos</th>
              <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Gastado</th>
              <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Alta</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b hairline last:border-0">
                <td className="p-3">{customer.email}</td>
                <td className="p-3 text-muted">{customer.name ?? "—"}</td>
                <td className="p-3">{customer._count.orders}</td>
                <td className="p-3">{formatMoney(customer.totalSpentCents)}</td>
                <td className="p-3 text-muted">{new Date(customer.createdAt).toLocaleDateString("es-ES")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Inventario ────────────────────────────────────────────────────────────────

type Movement = { id: string; change: number; before: number; after: number; reason: string; createdAt: string; variant: { size: string; product: { name: string }; color: { name: string } | null }; adminUser: { email: string } | null };
type VariantOption = { id: string; label: string };

export function InventoryManager({ variants }: { variants: VariantOption[] }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [form, setForm] = useState({ variantId: "", delta: "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api<{ movements: Movement[] }>("/api/admin/inventory").then((d) => setMovements(d.movements)).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);

  async function adjust(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/admin/inventory", {
        method: "POST",
        body: JSON.stringify({ variantId: form.variantId, delta: Number(form.delta), reason: form.reason }),
      });
      setForm({ variantId: "", delta: "", reason: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-5">Inventario</h1>
      {error && <p className="text-[1.35rem] text-magenta mb-4">{error}</p>}
      <form onSubmit={adjust} className="border hairline bg-paper p-5 mb-6 grid gap-3 sm:grid-cols-4 items-end">
        <label className="block sm:col-span-2"><span className="label">Variante</span>
          <select className="field py-2" required value={form.variantId} onChange={(e) => setForm((f) => ({ ...f, variantId: e.target.value }))}>
            <option value="">— Elegir —</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </label>
        <label className="block"><span className="label">Δ stock (+/−)</span>
          <input className="field py-2" required type="number" value={form.delta} onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))} />
        </label>
        <label className="block"><span className="label">Motivo</span>
          <input className="field py-2" required minLength={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </label>
        <button className="button sm:col-span-4 sm:w-auto" type="submit" disabled={saving}>{saving ? "Aplicando…" : "Aplicar ajuste"}</button>
      </form>
      <h2 className="text-[1.5rem] uppercase tracking-[0.12em] mb-3">Últimos movimientos</h2>
      <ul className="border-t hairline bg-paper">
        {movements.map((movement) => (
          <li key={movement.id} className="py-3 px-3 border-b hairline last:border-0 text-[1.3rem] flex flex-wrap justify-between gap-3">
            <span>
              {movement.variant.product.name} · {movement.variant.size}{movement.variant.color ? ` · ${movement.variant.color.name}` : ""}
              <span className="block text-[1.15rem] text-muted">{movement.reason} · {movement.adminUser?.email ?? "sistema"} · {new Date(movement.createdAt).toLocaleString("es-ES")}</span>
            </span>
            <span className={movement.change >= 0 ? "text-volt-dark" : "text-magenta"}>
              {movement.change > 0 ? "+" : ""}{movement.change} <span className="text-muted">({movement.before}→{movement.after})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Devoluciones ──────────────────────────────────────────────────────────────

type Return = { id: string; status: string; reason: string; createdAt: string; order: { orderNumber: string; email: string; shipName: string }; items: { qty: number; orderItem: { productName: string; size: string } }[] };

export function ReturnsManager() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api<{ returns: Return[] }>("/api/admin/returns").then((d) => setReturns(d.returns)).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);

  async function act(returnId: string, action: "APPROVE" | "REJECT" | "RECEIVE" | "REFUND") {
    if (!confirm(`¿${action} esta devolución?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/returns", { method: "PATCH", body: JSON.stringify({ returnId, action }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const nextAction: Record<string, { action: "APPROVE" | "REJECT" | "RECEIVE" | "REFUND"; label: string }[]> = {
    REQUESTED: [
      { action: "APPROVE", label: "Aprobar" },
      { action: "REJECT", label: "Rechazar" },
    ],
    APPROVED: [{ action: "RECEIVE", label: "Marcar recibida" }],
    RECEIVED: [{ action: "REFUND", label: "Reembolsar + reponer stock" }],
  };

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-5">Devoluciones</h1>
      {error && <p className="text-[1.35rem] text-magenta mb-4">{error}</p>}
      <ul className="border-t hairline bg-paper">
        {returns.length === 0 && <li className="py-4 px-3 text-muted text-[1.3rem]">No hay devoluciones.</li>}
        {returns.map((ret) => (
          <li key={ret.id} className="py-4 px-3 border-b hairline last:border-0">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-[1.35rem]">
                  <strong>{ret.order.orderNumber}</strong> · {ret.order.shipName} · <StatusBadge status={ret.status} />
                </p>
                <p className="text-[1.2rem] text-muted">
                  {ret.items.map((i) => `${i.qty}× ${i.orderItem.productName} (${i.orderItem.size})`).join(", ")} · {new Date(ret.createdAt).toLocaleDateString("es-ES")}
                </p>
                <p className="text-[1.25rem] mt-1">{ret.reason}</p>
              </div>
              <div className="flex gap-3 items-start">
                {(nextAction[ret.status] ?? []).map(({ action, label }) => (
                  <button
                    key={action}
                    type="button"
                    className={`button ${action === "REJECT" ? "button--secondary" : ""}`}
                    disabled={busy}
                    onClick={() => act(ret.id, action)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Mensajes ──────────────────────────────────────────────────────────────────

type Message = { id: string; name: string; email: string; subject: string; body: string; read: boolean; createdAt: string };

export function MessagesManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<{ messages: Message[] }>("/api/admin/messages").then((d) => setMessages(d.messages)).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);

  async function markRead(message: Message) {
    await api("/api/admin/messages", { method: "PATCH", body: JSON.stringify({ id: message.id, read: !message.read }) });
    await load();
  }

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-5">Mensajes de contacto</h1>
      {error && <p className="text-[1.35rem] text-magenta mb-4">{error}</p>}
      <ul className="border-t hairline bg-paper">
        {messages.length === 0 && <li className="py-4 px-3 text-muted text-[1.3rem]">No hay mensajes.</li>}
        {messages.map((message) => (
          <li key={message.id} className={`py-4 px-3 border-b hairline last:border-0 ${message.read ? "" : "bg-wash"}`}>
            <div className="flex flex-wrap justify-between gap-3">
              <p className="text-[1.35rem]">
                <strong>{message.subject}</strong> {!message.read && <span className="text-[1.1rem] text-volt-dark">● nuevo</span>}
                <span className="block text-[1.2rem] text-muted">{message.name} · {message.email} · {new Date(message.createdAt).toLocaleString("es-ES")}</span>
              </p>
              <button type="button" className="text-[1.3rem] underline" onClick={() => markRead(message)}>
                {message.read ? "Marcar no leído" : "Marcar leído"}
              </button>
            </div>
            <p className="text-[1.3rem] mt-2 whitespace-pre-wrap">{message.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Auditoría ─────────────────────────────────────────────────────────────────

type Log = { id: string; action: string; entity: string; entityId: string | null; createdAt: string; adminUser: { email: string } | null };

export function AuditTable() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ logs: Log[] }>("/api/admin/audit").then((d) => setLogs(d.logs)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-[1.35rem] text-magenta">{error}</p>;

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-5">Auditoría</h1>
      <p className="text-[1.25rem] text-muted mb-4">Registro inmutable de acciones administrativas. Requiere SUPER_ADMIN.</p>
      <ul className="border-t hairline bg-paper">
        {logs.map((log) => (
          <li key={log.id} className="py-2.5 px-3 border-b hairline last:border-0 text-[1.25rem] flex flex-wrap justify-between gap-3">
            <span><strong>{log.action}</strong> · {log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 10)}…` : ""}</span>
            <span className="text-muted">{log.adminUser?.email ?? "sistema"} · {new Date(log.createdAt).toLocaleString("es-ES")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
