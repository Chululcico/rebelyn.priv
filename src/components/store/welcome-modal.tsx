"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const WELCOME_KEY = "rb_welcome_done";
const NEWSLETTER_KEY = "rb_newsletter_pref";

export function WelcomeModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"login" | "guest">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const done = localStorage.getItem(WELCOME_KEY);
      if (!done) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function closeModal(guest = false) {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
      if (guest) {
        localStorage.setItem("rb_guest", "1");
      }
    } catch {}
    setVisible(false);
    window.dispatchEvent(new Event("rb-welcome-closed"));
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

      closeModal(false);
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    closeModal(true);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => closeModal(true)} />
      <div className="relative w-full max-w-[42rem] bg-paper border hairline shadow-[0_20px_60px_rgb(0_0_0/40%)] max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={() => closeModal(true)}
          className="absolute top-3 right-3 p-2 text-muted hover:text-ink"
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-[2rem] uppercase tracking-[0.16em] mb-2">Bienvenido a REBELYN</h2>
            <p className="text-[1.35rem] text-muted">Inicia sesión o entra como invitado para continuar</p>
          </div>

          <div className="flex gap-2 mb-6 border-b hairline">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 pb-3 text-[1.3rem] uppercase tracking-[0.12em] ${
                mode === "login" ? "border-b-2 border-ink -mb-[1px]" : "text-muted"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode("guest")}
              className={`flex-1 pb-3 text-[1.3rem] uppercase tracking-[0.12em] ${
                mode === "guest" ? "border-b-2 border-ink -mb-[1px]" : "text-muted"
              }`}
            >
              Entrar como invitado
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="welcome-email" className="block text-[1.2rem] uppercase tracking-[0.1em] mb-2">
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
                />
              </div>
              <div>
                <label htmlFor="welcome-password" className="block text-[1.2rem] uppercase tracking-[0.1em] mb-2">
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
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="mt-1 w-5 h-5"
                />
                <span className="text-[1.3rem] text-muted">
                  Quiero recibir notificaciones por correo sobre novedades, rebajas, nuevos productos y ofertas.
                </span>
              </label>

              {error && <p className="text-[1.3rem] text-magenta">{error}</p>}

              <button type="submit" disabled={loading} className="button w-full">
                {loading ? "Iniciando..." : "Iniciar sesión"}
              </button>

              <div className="text-center text-[1.3rem] text-muted space-y-1">
                <p>
                  ¿No tienes cuenta?{" "}
                  <Link href="/register" className="underline" onClick={() => closeModal(false)}>
                    Regístrate
                  </Link>
                </p>
                <p>
                  <Link href="/forgot-password" className="underline" onClick={() => closeModal(false)}>
                    ¿Has olvidado tu contraseña?
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-[1.35rem] text-muted text-center">
                Puedes navegar y comprar como invitado. No necesitarás crear una cuenta para realizar tu pedido.
              </p>
              <button type="button" onClick={handleGuest} className="button w-full">
                Entrar como invitado
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t hairline text-center text-[1.2rem] text-muted">
            <p>
              Al continuar aceptas los{" "}
              <Link href="/terms" className="underline">Términos y condiciones de compra</Link>, la{" "}
              <Link href="/privacy" className="underline">Política de privacidad</Link> y el uso de{" "}
              <Link href="/cookies" className="underline">cookies</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
