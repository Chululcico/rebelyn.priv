"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { GoogleAuthButton } from "./google-auth-button";

export function LoginForm() {
  const router = useRouter();
  const next = "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/firebase/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No hemos podido iniciar sesión.");
      }

      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "No hemos podido iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[42rem] mx-auto py-16">
      <h1 className="title-section text-center">Iniciar sesión</h1>
      <p className="text-[1.35rem] text-muted text-center mb-8">
        ¿Primera vez? <a href="/register" className="underline">Crea una cuenta</a>
      </p>

      <form onSubmit={submit}>
        <label className="block mb-4">
          <span className="label">Email</span>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block mb-6">
          <span className="label">Contraseña</span>
          <input className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>

        {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}

        <button className="button w-full" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p className="text-[1.3rem] text-center mt-4">
          <a href="/forgot-password" className="underline text-muted">¿Has olvidado tu contraseña?</a>
        </p>
      </form>

      <div className="flex items-center gap-3 text-[1.2rem] text-muted mt-8 mb-6">
        <span className="h-px flex-1 bg-[rgb(18_18_18_/10%)]" />
        <span>o</span>
        <span className="h-px flex-1 bg-[rgb(18_18_18_/10%)]" />
      </div>
      <GoogleAuthButton next="/account" />
    </div>
  );
}

export function LoginFormWrapped() {
  return <LoginForm />;
}

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "No hemos podido crear la cuenta.");
      return;
    }
    const login = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });
    setLoading(false);
    if (login.ok) {
      window.location.href = "/account";
    } else {
      window.location.href = "/login";
    }
  }

  return (
    <div className="max-w-[42rem] mx-auto py-16">
      <h1 className="title-section text-center">Crear cuenta</h1>
      <p className="text-[1.35rem] text-muted text-center mb-8">
        ¿Ya tienes cuenta? <a href="/login" className="underline">Inicia sesión</a>
      </p>

      <form onSubmit={submit}>
        <label className="block mb-4">
          <span className="label">Nombre</span>
          <input className="field" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
        </label>
        <label className="block mb-4">
          <span className="label">Email</span>
          <input className="field" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoComplete="email" />
        </label>
        <label className="block mb-6">
          <span className="label">Contraseña</span>
          <input className="field" type="password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
          <span className="text-[1.2rem] text-muted">Mínimo 8 caracteres, con letras y números.</span>
        </label>

        {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}

        <button className="button w-full" type="submit" disabled={loading}>
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-[1.2rem] text-muted mt-8 mb-6">
        <span className="h-px flex-1 bg-[rgb(18_18_18_/10%)]" />
        <span>o</span>
        <span className="h-px flex-1 bg-[rgb(18_18_18_/10%)]" />
      </div>
      <GoogleAuthButton next="/account" />
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No hemos podido enviar el email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="max-w-[42rem] mx-auto py-16 text-center">
        <h1 className="title-section">Email enviado</h1>
        <p className="text-[1.45rem] text-muted mt-4">
          Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
          Revisa también la carpeta de spam.
        </p>
        <a href="/login" className="button mt-8 inline-block">Volver a iniciar sesión</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-[42rem] mx-auto py-16">
      <h1 className="title-section text-center">Recuperar contraseña</h1>
      <p className="text-[1.35rem] text-muted text-center mb-8">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <label className="block mb-6">
        <span className="label">Email</span>
        <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}
      <button className="button w-full" type="submit" disabled={loading}>
        {loading ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "El enlace no es válido o ha caducado.");
      return;
    }
    router.push("/login?reset=1");
  }

  if (!token) {
    return (
      <div className="max-w-[42rem] mx-auto py-16 text-center">
        <h1 className="title-section">Enlace no válido</h1>
        <p className="text-[1.45rem] text-muted mt-4">Solicita uno nuevo desde <a href="/forgot-password" className="underline">recuperar contraseña</a>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-[42rem] mx-auto py-16">
      <h1 className="title-section text-center">Nueva contraseña</h1>
      <label className="block mb-6">
        <span className="label">Contraseña nueva</span>
        <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <span className="text-[1.2rem] text-muted">Mínimo 8 caracteres, con letras y números.</span>
      </label>
      {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}
      <button className="button w-full" type="submit" disabled={loading}>
        {loading ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
