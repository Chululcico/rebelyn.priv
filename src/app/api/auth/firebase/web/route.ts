import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { createSession, mergeCarts } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({ idToken: z.string().min(1) });

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    try {
      const { idToken } = schema.parse(await readJson(request));
      const decoded = await adminAuth.verifyIdToken(idToken);
      const email = decoded.email?.toLowerCase();

      if (!email) {
        return NextResponse.json({ error: "Email no disponible" }, { status: 400 });
      }

      let user = await db.user.findUnique({ where: { email } });

      if (!user) {
        user = await db.user.create({
          data: {
            email,
            passwordHash: "",
            name: decoded.name || null,
          },
        });
      } else if (decoded.name && !user.name) {
        user = await db.user.update({
          where: { id: user.id },
          data: { name: decoded.name },
        });
      }

      const cookieStore = await cookies();
      const guestToken = cookieStore.get("rb_cart")?.value;
      if (guestToken) {
        await mergeCarts(user.id, guestToken);
      }

      await createSession(user.id);

      return NextResponse.json({
        ok: true,
        user: { email: user.email, name: user.name, role: user.role },
      });
    } catch (error) {
      console.error("[auth/firebase/web]", error);
      const message = error instanceof Error ? error.message : "Error interno";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { rateLimit: { limit: 20, windowMs: 15 * 60 * 1000, key: "auth-firebase-web" } }
);
