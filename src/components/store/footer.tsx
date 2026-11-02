"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

const LEGAL = [
  { href: "/legal", label: "Aviso legal" },
  { href: "/privacy", label: "Política de privacidad" },
  { href: "/cookies", label: "Política de cookies" },
  { href: "/terms", label: "Condiciones generales de compra" },
];

const HELP = [
  { href: "/shipping", label: "Envíos" },
  { href: "/returns", label: "Devoluciones" },
  { href: "/size-guide", label: "Guía de tallas" },
  { href: "/contact", label: "Contacto" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setStatus("ok");
      setMessage("¡Estás dentro! Te avisamos del próximo drop.");
      setEmail("");
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus("error");
      setMessage(data.error ?? "No hemos podido registrarte. Inténtalo de nuevo.");
    }
  }

  return (
    <footer className="border-t hairline mt-20">
      <div className="page-width grid gap-12 py-14 md:grid-cols-4">
        <div>
          <h2 className="text-[1.4rem] uppercase tracking-[0.2em] mb-4">Rebelyn</h2>
          <p className="text-[1.35rem] text-muted">{BRAND.tagline}. Combina comodidad y estilo cada día.</p>
          <div className="flex gap-4 mt-6">
            <a href={BRAND.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-magenta">Instagram</a>
            <a href={BRAND.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-magenta">TikTok</a>
          </div>
        </div>

        <div>
          <h2 className="text-[1.4rem] uppercase tracking-[0.2em] mb-4">Ayuda</h2>
          <ul className="flex flex-col gap-2 text-[1.35rem]">
            {HELP.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-muted hover:text-magenta">{item.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-[1.4rem] uppercase tracking-[0.2em] mb-4">Privacidad</h2>
          <ul className="flex flex-col gap-2 text-[1.35rem]">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-muted hover:text-magenta">{item.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-[1.4rem] uppercase tracking-[0.2em] mb-4">Newsletter</h2>
          <p className="text-[1.35rem] text-muted mb-4">Drops, novedades y cosas que no publicamos en redes.</p>
          <form onSubmit={subscribe} className="flex flex-col gap-2">
            <label htmlFor="newsletter-email" className="sr-only">Email</label>
            <input
              id="newsletter-email"
              className="field"
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <button className="button" type="submit" disabled={status === "loading"}>
              Suscribirme
            </button>
          </form>
          {message && (
            <p className={`text-[1.25rem] mt-2 ${status === "error" ? "text-magenta" : "text-muted"}`} role="status">
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="border-t hairline">
        <div className="page-width py-5 flex flex-wrap items-center justify-between gap-2 text-[1.2rem] text-muted">
          <span>© {new Date().getFullYear()} REBELYN</span>
          <a href="/contact-dev" className="hover:text-magenta underline">
            Diseño: Diego Acosta
          </a>
        </div>
      </div>
    </footer>
  );
}
