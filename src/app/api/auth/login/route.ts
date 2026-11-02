import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { loginSchema } from "@/lib/validate";
import { loginCustomer, recentFailedAttempts } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const input = loginSchema.parse(await readJson(request));
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    // Bloqueo temporal: 8 fallos en 15 minutos con este email o desde esta IP.
    const failures = await recentFailedAttempts(input.email, ip);
    if (failures >= 8) {
      return NextResponse.json(
        { error: "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo." },
        { status: 429 },
      );
    }

    const ipLimit = rateLimit(`login-ip:${ip ?? "unknown"}`, 20, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json({ error: "Demasiados intentos desde esta red." }, { status: 429 });
    }

    const user = await loginCustomer({ email: input.email, password: input.password, ip });
    return NextResponse.json({ ok: true, user: { email: user.email, name: user.name, role: user.role } });
  },
  { rateLimit: { limit: 30, windowMs: 15 * 60 * 1000, key: "login" } },
);
