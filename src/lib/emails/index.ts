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

/**
 * Envía muchos emails en lotes de Resend (máx. 100 por lote).
 * Devuelve cuántos se aceptaron y, si algo falla, el motivo.
 */
export async function sendEmailBatch(
  params: { to: string; subject: string; react: ReactElement }[],
): Promise<{ ok: boolean; sent: number; failed: number; error?: string }> {
  if (params.length === 0) return { ok: true, sent: 0, failed: 0 };

  const resend = getClient();
  if (!resend) {
    return {
      ok: false,
      sent: 0,
      failed: params.length,
      error: "Los correos no se pueden enviar: falta RESEND_API_KEY en la configuración de Vercel.",
    };
  }

  const CHUNK = 100;
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (let i = 0; i < params.length; i += CHUNK) {
    const chunk = params.slice(i, i + CHUNK);
    try {
      const { error } = await resend.batch.send(
        chunk.map((email) => ({
          from: env.emailFrom,
          to: email.to,
          subject: email.subject,
          react: email.react,
        })),
      );
      if (error) {
        failed += chunk.length;
        lastError = error.message;
        console.error(`[email:batch] ${error.message}`);
      } else {
        sent += chunk.length;
      }
    } catch (error) {
      failed += chunk.length;
      lastError = error instanceof Error ? error.message : "Error de envío";
      console.error(`[email:batch] ${lastError}`);
    }

    // Resend permite ~2 peticiones por segundo: pequeña pausa entre lotes.
    if (i + CHUNK < params.length) await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return { ok: failed === 0, sent, failed, error: lastError };
}
