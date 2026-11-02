import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { changePasswordSchema, profileSchema } from "@/lib/validate";
import { getCurrentUserFull, hashPassword, toSafeUser, verifyPassword, AuthError } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withApi(async () => {
  const user = await getCurrentUserFull();
  if (!user) return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  return NextResponse.json({ user: toSafeUser(user) });
});

export const PATCH = withApi(async (request: Request) => {
  const user = await getCurrentUserFull();
  if (!user) return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });

  const input = profileSchema.parse(await readJson(request));
  const updated = await db.user.update({
    where: { id: user.id },
    data: { ...(input.name !== undefined ? { name: input.name || null } : {}), ...(input.phone !== undefined ? { phone: input.phone || null } : {}) },
  });
  return NextResponse.json({ user: toSafeUser(updated) });
});

export const POST = withApi(
  async (request: Request) => {
    const user = await getCurrentUserFull();
    if (!user) return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });

    const input = changePasswordSchema.parse(await readJson(request));
    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) throw new AuthError("La contraseña actual no es correcta", 400);

    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
    // Cerrar todas las sesiones: deberá entrar con la contraseña nueva.
    await db.session.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 10, windowMs: 60 * 60 * 1000, key: "change-password" } },
);
