"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";

/** El invitado no guarda nada: al recargar la página vuelve a ver el cartel.
 *  Solo se marca como visto cuando inicia sesión (o va a registrarse), y en
 *  ese caso /api/auth/me ya lo detecta como usuario con sesión. */
const SEEN_KEY = "rb_welcome_seen";
const NEWSLETTER_KEY = "rb_newsletter_pref";

function notifyClosed() {
  window.dispatchEvent(new Event("rb-welcome-closed"));
}

export function WelcomeModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "guest">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function decide() {
      // Si ya hay sesión iniciada, no se muestra nunca.
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { user?: { id: string } | null };
        if (cancelled) return;
        if (data.user) {
          setReady(true);
          notifyClosed();
          return;
        }
      } catch {
        /* sin conexión: seguimos con la comprobación local */
      }

      let seen = false;
      try {
        seen = sessionStorage.getItem(SEEN_KEY) === "1";
      } catch {
        seen = false;
      }

      if (cancelled) return;
      setReady(true);
      if (seen) {
        notifyClosed();
      } else {
        setVisible(true);
        // Bloquea el scroll del fondo mientras está abierto.
        document.documentElement.style.overflow = "hidden";
      }
    }

    decide();
    return () => {
      cancelled = true;
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Cerrar con Escape.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") chooseGuest();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  function finish(guest: boolean) {
    try {
      if (guest) {
        // Invitado: no guardamos que ya lo ha visto, así el cartel vuelve a
        // aparecer en cuanto recargue la página.
        sessionStorage.removeItem(SEEN_KEY);
        localStorage.setItem("rb_guest", "1");
      } else {
        sessionStorage.setItem(SEEN_KEY, "1");
      }
    } catch {}
    document.documentElement.style.overflow = "";
    setVisible(false);
    notifyClosed();
  }

  function chooseGuest() {
    finish(true);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se ha podido iniciar sesión");
        setLoading(false);
        return;
      }

      if (notifications && email) {
        try {
          await fetch("/api/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          localStorage.setItem(NEWSLETTER_KEY, "1");
        } catch {}
      }

      finish(false);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo otra vez.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={chooseGuest} />

      <div
        ref={panelRef}
        className="relative w-full max-w-[44rem] max-h-[92svh] overflow-y-auto rounded-[2.4rem] bg-paper shadow-[0_24px_80px_rgb(0_0_0/45%)] animate-[welcomeIn_.35s_ease-out]"
      >
        {/* Cabecera visual con el logo */}
        <div className="relative overflow-hidden rounded-t-[2.4rem] bg-ink px-6 pt-10 pb-8 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 20% 0%, rgba(255,255,255,.16), transparent 55%), radial-gradient(circle at 85% 100%, rgba(255,255,255,.08), transparent 55%)",
            }}
          />
          <button
            type="button"
            onClick={chooseGuest}
            className="absolute top-3 right-3 z-10 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/95 shadow-lg ring-4 ring-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoUi} alt="REBELYN" width={80} height={80} className="h-[7.2rem] w-auto" />
          </div>

          <h2 id="welcome-title" className="relative mt-4 text-[2.4rem] uppercase tracking-[0.18em] text-white">
            Bienvenido a REBELYN
          </h2>
          <p className="font-script relative mt-1 text-[2.4rem] leading-none text-volt">
            {BRAND.tagline.toLowerCase()}
          </p>
        </div>

        <div className="p-5 sm:p-8">
          {/* Selector tipo píldora */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-wash p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full py-2.5 text-[1.25rem] uppercase tracking-[0.1em] transition ${
                mode === "login" ? "bg-ink text-paper shadow" : "text-muted hover:text-ink"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode("guest")}
              className={`rounded-full py-2.5 text-[1.25rem] uppercase tracking-[0.1em] transition ${
                mode === "guest" ? "bg-ink text-paper shadow" : "text-muted hover:text-ink"
              }`}
            >
              Invitado
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="welcome-email" className="mb-1.5 block text-[1.2rem] uppercase tracking-[0.1em] text-muted">
                  Correo electrónico
                </label>
                <input
                  id="welcome-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field w-full"
                  autoComplete="email"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label htmlFor="welcome-password" className="mb-1.5 block text-[1.2rem] uppercase tracking-[0.1em] text-muted">
                  Contraseña
                </label>
                <input
                  id="welcome-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field w-full"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-black"
                />
                <span className="text-[1.25rem] leading-snug text-muted">
                  Quiero recibir novedades, rebajas y ofertas por correo.
                </span>
              </label>

              {error && (
                <p className="rounded-xl bg-magenta/10 px-3 py-2 text-[1.3rem] text-magenta" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="button w-full">
                {loading ? "Iniciando…" : "Iniciar sesión"}
              </button>

              <div className="space-y-1.5 pt-1 text-center text-[1.3rem] text-muted">
                <p>
                  ¿No tienes cuenta?{" "}
                  <Link href="/register" className="font-medium text-ink underline underline-offset-2" onClick={() => finish(false)}>
                    Regístrate
                  </Link>
                </p>
                <p>
                  <Link href="/forgot-password" className="underline underline-offset-2" onClick={() => finish(false)}>
                    ¿Has olvidado tu contraseña?
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <p className="text-[1.4rem] leading-relaxed text-muted">
                Puedes mirar, añadir al carrito y comprar sin crear cuenta.
                <br />
                Si quieres guardar tus pedidos y direcciones, inicia sesión.
              </p>
              <button type="button" onClick={chooseGuest} className="button w-full">
                Entrar como invitado
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="button button--secondary w-full"
              >
                Prefiero iniciar sesión
              </button>
            </div>
          )}

          <div className="mt-6 border-t hairline pt-4 text-center text-[1.15rem] leading-relaxed text-muted">
            Al continuar aceptas los{" "}
            <Link href="/terms" className="underline underline-offset-2">
              Términos y condiciones de compra
            </Link>
            , la{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Política de privacidad
            </Link>{" "}
            y el uso de{" "}
            <Link href="/cookies" className="underline underline-offset-2">
              cookies
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
