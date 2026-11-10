import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import type { ReactElement } from "react";

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) resendClient = new Resend(env.resendApiKey);
  return resendClient;
}

/**
 * Envía un email transaccional. Sin RESEND_API_KEY, el email se registra en
 * el log del servidor (útil en desarrollo): nada se pierde ni se rompe.
 */
export async function sendEmail(params: { to: string; subject: string; react: ReactElement }): Promise<{ ok: boolean; error?: string }> {
  const resend = getClient();

  if (!resend) {
    if (!env.isProd) {
      console.info(`[email:simulado] Para: ${params.to} · Asunto: ${params.subject}`);
    } else {
      console.error(`[email:no-enviado] Falta RESEND_API_KEY · ${params.subject}`);
    }
    return { ok: true };
  }

  try {
    const { error } = await resend.emails.send({ from: env.emailFrom, to: params.to, subject: params.subject, react: params.react });
    if (error) {
      console.error(`[email:error] ${params.subject}: ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error de envío" };
  }
}
