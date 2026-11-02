"use client";

import { useState } from "react";

type LookupItem = { id: string; productName: string; size: string; qty: number; totalCents: number };
type LookupOrder = { orderNumber: string; status: string; items: LookupItem[] };

/**
 * Devoluciones en dos pasos:
 * 1) localizar el pedido con número + email,
 * 2) elegir prendas/cantidades y el motivo.
 */
export function ReturnRequestForm() {
  const [step, setStep] = useState<"lookup" | "items">("lookup");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<LookupOrder | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setState("sending");
    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, email }),
    });
    const data = await res.json();
    setState("idle");
    if (!res.ok) {
      setError(data.error ?? "No encontramos el pedido. Comprueba el número y el email.");
      return;
    }
    setOrder(data.order);
    setStep("items");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const items = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, qty]) => ({ orderItemId, qty }));
    if (items.length === 0) {
      setError("Selecciona al menos una prenda a devolver.");
      return;
    }
    setState("sending");
    const res = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, email, reason, items }),
    });
    const data = await res.json();
    if (!res.ok) {
      setState("error");
      setError(data.error ?? "No hemos podido registrar la devolución.");
      return;
    }
    setState("idle");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="border hairline p-8 text-center">
        <p className="text-[1.6rem]">Solicitud recibida.</p>
        <p className="text-[1.3rem] text-muted mt-2">Te contestaremos con las instrucciones de envío de la devolución.</p>
      </div>
    );
  }

  if (step === "lookup" || !order) {
    return (
      <form onSubmit={lookup} className="border hairline p-6">
        <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mb-4">Localizar pedido</h2>
        <label className="block mb-4">
          <span className="label">Número de pedido</span>
          <input className="field" required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="RB-…" />
        </label>
        <label className="block mb-6">
          <span className="label">Email de la compra</span>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Buscando…" : "Buscar pedido"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="border hairline p-6">
      <h2 className="text-[1.4rem] uppercase tracking-[0.12em] mb-4">Pedido {order.orderNumber}</h2>
      <ul className="flex flex-col mb-5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3 border-b hairline">
            <span className="text-[1.35rem]">
              {item.productName} · Talla {item.size}
              <span className="block text-[1.2rem] text-muted">Máx. {item.qty} ud. en el pedido</span>
            </span>
            <label className="flex items-center gap-2 text-[1.3rem]">
              Devolver
              <input
                type="number"
                min={0}
                max={item.qty}
                className="field w-20 py-1"
                value={selected[item.id] ?? 0}
                onChange={(e) => setSelected((s) => ({ ...s, [item.id]: Math.max(0, Math.min(item.qty, Number(e.target.value))) }))}
              />
            </label>
          </li>
        ))}
      </ul>
      <label className="block mb-6">
        <span className="label">Motivo de la devolución</span>
        <textarea
          className="field"
          required
          minLength={10}
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Cuéntanos qué ha pasado."
        />
      </label>
      {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}
      <div className="flex gap-3">
        <button className="button" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Enviando…" : "Solicitar devolución"}
        </button>
        <button className="button button--secondary" type="button" onClick={() => setStep("lookup")}>
          Cambiar pedido
        </button>
      </div>
    </form>
  );
}
