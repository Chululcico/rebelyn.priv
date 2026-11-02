import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { contactSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/emails";
import { contactCopyEmail } from "@/lib/emails/templates";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const input = contactSchema.parse(await readJson(request));
    await db.contactMessage.create({
      data: { name: input.name, email: input.email, subject: input.subject || null, message: input.message },
    });
    // Copia al correo de la tienda (best-effort: si Resend falla, el mensaje
    // ya está guardado en BD y se ve desde /admin).
    await sendEmail({
      to: env.emailFrom.includes("<") ? env.emailFrom.split("<")[1].replace(">", "") : env.emailFrom,
      subject: `Contacto REBELYN · ${input.subject || "Mensaje"}`,
      react: contactCopyEmail(),
    });
    await sendEmail({ to: input.email, subject: "Hemos recibido tu mensaje · REBELYN", react: contactCopyEmail() });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 5, windowMs: 60 * 60 * 1000, key: "contact" } },
);
