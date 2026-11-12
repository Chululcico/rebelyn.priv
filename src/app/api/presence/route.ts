import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { withApi, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const COOKIE = "rb_visitor";
const ONE_YEAR = 60 * 60 * 24 * 365;
const ACTIVE_WINDOW_MS = 3 * 60 * 1000;

/**
 * Latido de presencia. Cada navegador recibe una cookie anónima y actualiza su
 * fila cada 45 s. Así el dashboard puede contar «usuarios activos ahora mismo»
 * sin guardar IPs ni datos personales.
 */
export const POST = withApi(
  async (request: Request) => {
    const body = (await readJson(request).catch(() => ({}))) as { path?: unknown };
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;

    const store = await cookies();
    let visitorId = store.get(COOKIE)?.value;
    if (!visitorId || visitorId.length < 16) {
      visitorId = randomBytes(16).toString("base64url");
      store.set(COOKIE, visitorId, {
        httpOnly: true,
        secure: env.isProd,
        sameSite: "lax",
        path: "/",
        maxAge: ONE_YEAR,
      });
    }

    const user = await getCurrentUser().catch(() => null);

    await db.presence.upsert({
      where: { visitorId },
      create: { visitorId, userId: user?.id ?? null, path },
      update: { userId: user?.id ?? null, path, lastSeen: new Date() },
    });

    // Limpieza de filas antiguas de vez en cuando (no en cada latido).
    if (Math.random() < 0.02) {
      await db.presence
        .deleteMany({ where: { lastSeen: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
        .catch(() => undefined);
    }

    const active = await db.presence.count({
      where: { lastSeen: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } },
    });

    return NextResponse.json({ active });
  },
  { csrf: false, rateLimit: { limit: 120, windowMs: 60_000, key: "presence" } },
);
