"use client";

import { useState } from "react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setState("error");
      setError(data.error ?? "No hemos podido enviar el mensaje.");
      return;
    }
    setState("sent");
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  if (state === "sent") {
    return (
      <div className="border hairline p-8 text-center">
        <p className="text-[1.6rem]">Mensaje enviado.</p>
        <p className="text-[1.35rem] text-muted mt-2">Te responderemos lo antes posible.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border hairline p-6">
      <label className="block mb-4">
        <span className="label">Nombre</span>
        <input className="field" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
      </label>
      <label className="block mb-4">
        <span className="label">Email</span>
        <input className="field" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoComplete="email" />
      </label>
      <label className="block mb-4">
        <span className="label">Asunto</span>
        <input className="field" required minLength={3} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
      </label>
      <label className="block mb-6">
        <span className="label">Mensaje</span>
        <textarea className="field" required minLength={10} rows={6} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
      </label>
      {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}
      <button className="button w-full sm:w-auto" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
