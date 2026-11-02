"use client";

import { useState } from "react";

export function ProfileForm({ initial }: { initial: { name: string; phone: string } }) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "No hemos podido guardar los cambios.");
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="max-w-[44rem]">
      <h2 className="text-[1.8rem] uppercase tracking-[0.14em] mb-6">Perfil</h2>
      <label className="block mb-4">
        <span className="label">Nombre</span>
        <input className="field" minLength={2} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label className="block mb-6">
        <span className="label">Teléfono</span>
        <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
      </label>
      {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}
      {saved && <p className="text-[1.35rem] text-muted mb-4" role="status">Cambios guardados.</p>}
      <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirm) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "No hemos podido cambiar la contraseña.");
      return;
    }
    setSaved(true);
    setCurrent("");
    setNew("");
    setConfirm("");
  }

  return (
    <form onSubmit={submit} className="max-w-[44rem]">
      <h2 className="text-[1.8rem] uppercase tracking-[0.14em] mb-6">Cambiar contraseña</h2>
      <label className="block mb-4">
        <span className="label">Contraseña actual</span>
        <input className="field" type="password" required value={currentPassword} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </label>
      <label className="block mb-4">
        <span className="label">Contraseña nueva</span>
        <input className="field" type="password" required minLength={8} value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" />
        <span className="text-[1.2rem] text-muted">Mínimo 8 caracteres, con letras y números.</span>
      </label>
      <label className="block mb-6">
        <span className="label">Repite la contraseña nueva</span>
        <input className="field" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </label>
      {error && <p className="text-[1.35rem] text-magenta mb-4" role="alert">{error}</p>}
      {saved && (
        <p className="text-[1.35rem] text-muted mb-4" role="status">
          Contraseña actualizada. Por seguridad, vuelve a iniciar sesión.
        </p>
      )}
      <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Cambiar contraseña"}</button>
    </form>
  );
}
