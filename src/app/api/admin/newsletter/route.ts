import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmailBatch } from "@/lib/emails";
import { newsletterEmail } from "@/lib/emails/templates";
import { resolveBaseUrl } from "@/lib/public-url";
import { unsubscribeUrl } from "@/lib/newsletter";
import { newsletterCampaignSchema } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Con lotes de 100 emails por petición esto sobra para listas normales.
export const maxDuration = 60;

type Campaign = {
  subject: string;
  sentAt: string;
  recipients: number;
  sent: number;
  failed: number;
  error: string | null;
};

export const GET = withApi(async () => {
  await requireAdmin();

  const [subscribers, total, active, lastCampaign] = await Promise.all([
    db.newsletterSubscriber.findMany({
      orderBy: [{ active: "desc" }, { consentAt: "desc" }],
      select: { id: true, email: true, consentAt: true, active: true },
    }),
    db.newsletterSubscriber.count(),
    db.newsletterSubscriber.count({ where: { active: true } }),
    db.setting.findUnique({ where: { key: "newsletterCampaign" } }),
  ]);

  return NextResponse.json({
    subscribers,
    stats: { total, active, inactive: total - active },
    lastCampaign: (lastCampaign?.value as Campaign | null) ?? null,
    emailFrom: env.emailFrom,
    resendConfigured: Boolean(env.resendApiKey),
  });
});

export const POST = withApi(
  async (request: Request) => {
    await requireAdmin();

    const { subject, message } = newsletterCampaignSchema.parse(await readJson(request));

    if (!env.resendApiKey) {
      return NextResponse.json(
        { error: "No se pueden enviar correos: falta RESEND_API_KEY en la configuración de Vercel." },
        { status: 400 },
      );
    }

    const subscribers = await db.newsletterSubscriber.findMany({
      where: { active: true },
      orderBy: { consentAt: "asc" },
      select: { email: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ error: "No hay ningún suscriptor activo." }, { status: 400 });
    }

    const baseUrl = resolveBaseUrl(request);
    const emails = subscribers.map((subscriber) => ({
      to: subscriber.email,
      subject,
      react: newsletterEmail({
        subject,
        message,
        unsubscribeUrl: unsubscribeUrl(baseUrl, subscriber.email),
      }),
    }));

    const result = await sendEmailBatch(emails);

    const campaign: Campaign = {
      subject,
      sentAt: new Date().toISOString(),
      recipients: subscribers.length,
      sent: result.sent,
      failed: result.failed,
      error: result.error ?? null,
    };

    await db.setting.upsert({
      where: { key: "newsletterCampaign" },
      create: { key: "newsletterCampaign", value: campaign },
      update: { value: campaign },
    });

    // Devolvemos 200 con el resumen para poder enseñar cuántos salieron bien.
    return NextResponse.json({ ok: result.ok, ...campaign });
  },
  { rateLimit: { limit: 5, windowMs: 10 * 60 * 1000, key: "admin-newsletter-send" } },
);
