"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/firebase/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Acceso denegado");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-[38rem] mx-auto py-20">
      <h1 className="title-section text-center">Acceso administrador</h1>
      <p className="text-[1.3rem] text-muted text-center mb-8">Solo cuentas autorizadas</p>

      <label className="block mb-4">
        <span className="label">Email</span>
        <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </label>
      <label className="block mb-6">
        <span className="label">Contraseña</span>
        <input className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>

      {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}

      <button className="button w-full" type="submit" disabled={loading}>
        {loading ? "Accediendo…" : "Acceder al panel"}
      </button>
    </form>
  );
}
