import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/emails";
import { newsletterEmail } from "@/lib/emails/templates";
import { resolveBaseUrl } from "@/lib/public-url";
import { unsubscribeUrl } from "@/lib/newsletter";
import { newsletterCampaignSchema } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 30;

/** Dirección fija para probar el envío antes de mandarlo a toda la lista. */
const TEST_RECIPIENT = "rebelyn.web@gmail.com";

export const POST = withApi(
  async (request: Request) => {
    await requireAdmin();

    const { subject, message } = newsletterCampaignSchema.parse(await readJson(request));
    const baseUrl = resolveBaseUrl(request);

    const sent = await sendEmail({
      to: TEST_RECIPIENT,
      subject: `[PRUEBA] ${subject}`,
      react: newsletterEmail({
        subject,
        message,
        unsubscribeUrl: unsubscribeUrl(baseUrl, TEST_RECIPIENT),
      }),
    });

    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error ?? "No se pudo enviar el correo de prueba." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, to: TEST_RECIPIENT });
  },
  { rateLimit: { limit: 10, windowMs: 60 * 1000, key: "admin-newsletter-test" } },
);
