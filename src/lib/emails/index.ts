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
 * Envía un email transaccional con Resend.
 * Si falta RESEND_API_KEY o Resend rechaza el envío, devuelve { ok: false }
 * con el motivo (para poder mostrarlo en el panel de administración).
 */
export async function sendEmail(params: { to: string; subject: string; react: ReactElement }): Promise<{ ok: boolean; error?: string }> {
  const resend = getClient();

  if (!resend) {
    if (!env.isProd) {
      console.info(`[email:simulado] Para: ${params.to} · Asunto: ${params.subject}`);
    }
    return {
      ok: false,
      error: "Los correos no se pueden enviar: falta RESEND_API_KEY en la configuración de Vercel.",
    };
  }

  try {
    const { error } = await resend.emails.send({ from: env.emailFrom, to: params.to, subject: params.subject, react: params.react });
    if (error) {
      console.error(`[email:error] ${params.subject}: ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de envío";
    console.error(`[email:error] ${params.subject}: ${message}`);
    return { ok: false, error: message };
  }
}
