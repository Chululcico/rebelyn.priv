import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { withApi, readJson } from "@/lib/api";
import { resetSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const input = resetSchema.parse(await readJson(request));
    const tokenHash = createHash("sha256").update(input.token).digest("hex");

    const reset = await db.passwordReset.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: "El enlace no es válido o ha caducado" }, { status: 400 });
    }

    await db.$transaction([
      db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(input.password) } }),
      db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      // Cerrar todas las sesiones abiertas tras cambiar la contraseña.
      db.session.deleteMany({ where: { userId: reset.userId } }),
    ]);

    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 10, windowMs: 60 * 60 * 1000, key: "reset" } },
);
