import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { withApi, readJson } from "@/lib/api";
import { forgotSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/emails";
import { resetPasswordEmail } from "@/lib/emails/templates";
import { resolveBaseUrl } from "@/lib/public-url";

export const runtime = "nodejs";

/** Respuesta idéntica exista o no el email: no revelamos cuentas. */
const GENERIC = { ok: true as const, message: "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña." };

export const POST = withApi(
  async (request: Request) => {
    const { email } = forgotSchema.parse(await readJson(request));
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const token = randomBytes(32).toString("base64url");
      await db.passwordReset.create({
        data: {
          tokenHash: createHash("sha256").update(token).digest("hex"),
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const resetUrl = `${resolveBaseUrl(request)}/account/reset-password?token=${token}`;
      await sendEmail({ to: user.email, subject: "Restablecer tu contraseña REBELYN", react: resetPasswordEmail(resetUrl) });
    }

    return NextResponse.json(GENERIC);
  },
  { rateLimit: { limit: 5, windowMs: 60 * 60 * 1000, key: "forgot" } },
);
