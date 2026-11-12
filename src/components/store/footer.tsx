"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { PaymentLogo } from "./payment-logos";

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

const SOCIAL = [
  { href: BRAND.instagram, label: "Instagram", icon: <IconInstagram /> },
  { href: BRAND.tiktok, label: "TikTok", icon: <IconTikTok /> },
  { href: `https://wa.me/${BRAND.phone.replace(/\D/g, "")}`, label: "WhatsApp", icon: <IconWhatsApp /> },
];

const PAYMENTS = ["visa", "mastercard", "maestro", "amex", "applepay", "googlepay"];

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
    <footer className="border-t hairline mt-20 bg-paper">
      <div className="page-width grid grid-cols-2 gap-x-8 gap-y-12 py-14 md:grid-cols-4 md:gap-12">
        {/* Marca */}
        <div className="col-span-2 md:col-span-1">
          <a href="/" className="inline-block" aria-label="REBELYN · Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoPng} alt="REBELYN" width={120} height={120} loading="lazy" decoding="async" className="h-16 w-auto" />
          </a>
          <p className="font-script text-[2.2rem] leading-tight text-magenta mt-2">{BRAND.tagline}</p>
          <p className="text-[1.35rem] text-muted mt-1">Combina comodidad y estilo cada día.</p>
          <div className="flex gap-3 mt-6">
            {SOCIAL.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border hairline text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                {item.icon}
              </a>
            ))}
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

        <div className="col-span-2 md:col-span-1">
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

      {/* Sellos de pago: dan confianza y hacen el pie más visual. */}
      <div className="border-t hairline">
        <div className="page-width py-5 flex flex-wrap items-center justify-center gap-3">
          <span className="text-[1.2rem] uppercase tracking-[0.16em] text-muted mr-2">Pago seguro</span>
          {PAYMENTS.map((id) => (
            <PaymentLogo key={id} id={id} />
          ))}
        </div>
      </div>

      <div className="border-t hairline">
        <div className="page-width py-5 flex flex-wrap items-center justify-between gap-2 text-[1.2rem] text-muted">
          <span>© {new Date().getFullYear()} REBELYN · Todos los derechos reservados</span>
          <a href="/contact-dev" className="hover:text-magenta underline">
            Diseño: Diego Acosta
          </a>
        </div>
      </div>
    </footer>
  );
}

function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.2 1.7 1.2 3.1 2.9 3.9.7.3 1.5.5 2.3.5v3c-1.6 0-3-.4-4.3-1.2v5.7c0 3.3-2.5 5.9-5.8 5.9-3.2 0-5.8-2.6-5.8-5.8 0-3.3 2.7-5.9 6-5.8v3.1c-.3-.1-.7-.2-1-.2-1.7 0-3 1.3-3 2.9s1.3 3 3 3c1.7 0 2.9-1.4 2.9-3.1V3h2.8Z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.32 4.95L2 22l5.23-1.37a9.9 9.9 0 0 0 4.8 1.23h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm5.84 14.13c-.25.7-1.45 1.34-2 1.38-.55.05-1.07.25-3.6-.75-3.06-1.2-5-4.33-5.15-4.53-.15-.2-1.23-1.64-1.23-3.13 0-1.49.78-2.22 1.06-2.53.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.68.52.25.6.85 2.07.93 2.22.08.15.13.32.03.52-.1.2-.15.32-.3.5-.15.17-.31.38-.45.51-.15.15-.3.31-.13.61.17.3.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.38 1.47.3.15.47.13.65-.08.17-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.75.82 2.05.97.3.15.5.22.57.35.08.13.08.75-.17 1.45Z" />
    </svg>
  );
}
