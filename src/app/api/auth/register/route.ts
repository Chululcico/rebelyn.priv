import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { registerSchema } from "@/lib/validate";
import { registerCustomer } from "@/lib/auth";
import { sendEmail } from "@/lib/emails";
import { welcomeEmail } from "@/lib/emails/templates";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const input = registerSchema.parse(await readJson(request));
    const user = await registerCustomer(input);

    await sendEmail({ to: user.email, subject: "Bienvenido a REBELYN", react: welcomeEmail(user.name) });

    return NextResponse.json({ ok: true, user: { email: user.email, name: user.name } }, { status: 201 });
  },
  { rateLimit: { limit: 10, windowMs: 60 * 60 * 1000, key: "register" } },
);
