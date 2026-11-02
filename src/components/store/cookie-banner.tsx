"use client";

import { useEffect, useState } from "react";

type Consent = { necessary: true; analytics: boolean; marketing: boolean; decidedAt: string };

const KEY = "rb_cookie_consent";

/**
 * Banner de cookies RGPD/LSSI.
 * · No precarga ninguna casilla de consentimiento.
 * · Separa el consentimiento de las cookies no esenciales del resto de la info legal.
 * · «Rechazar» guarda el mismo tipo de registro que «Aceptar».
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const welcomeDone = localStorage.getItem("rb_welcome_done");
      if (!raw && welcomeDone) setVisible(true);
    } catch {
      if (localStorage.getItem("rb_welcome_done")) setVisible(true);
    }

    const onWelcomeClosed = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) setVisible(true);
      } catch {
        setVisible(true);
      }
    };
    window.addEventListener("rb-welcome-closed", onWelcomeClosed);
    return () => window.removeEventListener("rb-welcome-closed", onWelcomeClosed);
  }, []);

  function save(next: { analytics: boolean; marketing: boolean }) {
    const consent: Consent = { necessary: true, ...next, decidedAt: new Date().toISOString() };
    try {
      localStorage.setItem(KEY, JSON.stringify(consent));
    } catch {
      /* almacenamiento bloqueado */
    }
    // Aquí es donde se cargarían GTM/Meta Pixel si el consentimiento es true.
    setVisible(false);
    setPanel(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6" role="dialog" aria-modal="false" aria-label="Preferencias de cookies">
      <div className="max-w-[92rem] mx-auto bg-paper border hairline shadow-[0_-8px_40px_rgb(0_0_0/12%)] p-5 md:p-6">
        {!panel ? (
          <>
            <p className="text-[1.35rem] mb-1">
              Usamos cookies propias para que la tienda funcione (carrito, sesión). Con tu permiso, también cookies de analítica y
              marketing.
            </p>
            <p className="text-[1.2rem] text-muted mb-4">
              Puedes aceptar todas, rechazar las no necesarias o configurar tus preferencias. Más info en la{" "}
              <a href="/cookies" className="underline">política de cookies</a>.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="button" type="button" onClick={() => save({ analytics: true, marketing: true })}>
                Aceptar todas
              </button>
              <button className="button button--secondary" type="button" onClick={() => save({ analytics: false, marketing: false })}>
                Rechazar no necesarias
              </button>
              <button className="button button--secondary" type="button" onClick={() => setPanel(true)}>
                Configurar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[1.5rem] uppercase tracking-[0.14em] mb-4">Preferencias de cookies</h2>
            <ul className="flex flex-col gap-3 mb-5">
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[1.35rem]">Necesarias</p>
                  <p className="text-[1.2rem] text-muted">Carrito, sesión y seguridad. Siempre activas.</p>
                </div>
                <input type="checkbox" checked disabled aria-label="Cookies necesarias (siempre activas)" className="mt-1 w-5 h-5" />
              </li>
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[1.35rem]">Analítica</p>
                  <p className="text-[1.2rem] text-muted">Nos ayudan a entender cómo se usa la tienda.</p>
                </div>
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} aria-label="Cookies de analítica" className="mt-1 w-5 h-5" />
              </li>
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[1.35rem]">Marketing</p>
                  <p className="text-[1.2rem] text-muted">Publicidad personalizada en redes y buscadores.</p>
                </div>
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} aria-label="Cookies de marketing" className="mt-1 w-5 h-5" />
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button className="button" type="button" onClick={() => save({ analytics, marketing })}>
                Guardar preferencias
              </button>
              <button className="button button--secondary" type="button" onClick={() => setPanel(false)}>
                Volver
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
