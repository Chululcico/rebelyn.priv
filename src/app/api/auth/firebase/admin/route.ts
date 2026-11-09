import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ idToken: z.string().min(1) });

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    try {
      const { idToken } = schema.parse(await readJson(request));
      const decoded = await verifyFirebaseIdToken(idToken);
      const email = decoded.email?.toLowerCase();

      if (!email) {
        return NextResponse.json({ error: "Email no disponible" }, { status: 400 });
      }

      const user = await db.user.findUnique({ where: { email } });

      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
      }

      await createSession(user.id);

      return NextResponse.json({
        ok: true,
        user: { email: user.email, name: user.name, role: user.role },
      });
    } catch (error) {
      console.error("[auth/firebase/admin]", error);
      const message = error instanceof Error ? error.message : "Error interno";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { rateLimit: { limit: 10, windowMs: 15 * 60 * 1000, key: "auth-firebase-admin" } }
);
