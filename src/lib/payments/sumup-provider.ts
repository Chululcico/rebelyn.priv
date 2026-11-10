import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, RefundInput, RefundResult } from "./types";

export type SumupCheckout = {
  id: string;
  checkout_reference: string;
  status: string;
  amount: number;
  currency: string;
  hosted_checkout?: { enabled: boolean };
  hosted_checkout_url?: string;
  /** Campo legacy: SumUp ya no lo devuelve, se mantiene como fallback. */
  checkout_url?: string;
};

/** Traduce el cuerpo de error de SumUp a un mensaje legible. */
async function sumupErrorDetail(res: Response): Promise<string> {
  const raw = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const parts = parsed
        .map((e) => {
          const err = e as { message?: string; param?: string; error_code?: string };
          return [err.message, err.param, err.error_code].filter(Boolean).join(" ");
        })
        .filter(Boolean);
      if (parts.length) return parts.join("; ");
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as { detail?: string; message?: string; title?: string };
      return String(obj.detail ?? obj.message ?? obj.title ?? raw);
    }
  } catch {
    /* respuesta no JSON */
  }
  return raw.slice(0, 300) || `HTTP ${res.status}`;
}

/**
 * Crea un checkout hospedado de SumUp SIN crear aún ningún pedido.
 * Devuelve la URL a la que redirigir al cliente para pagar con tarjeta.
 * Docs: POST /v0.1/checkouts con hosted_checkout.enabled=true →
 * la respuesta incluye hosted_checkout_url (checkout_url ya no existe).
 */
export async function createSumupCheckout(params: {
  reference: string;
  amountCents: number;
  currency: string;
  description?: string;
  /** URL a la que vuelve el NAVEGADOR del cliente tras pagar (botón de volver). */
  returnUrl: string;
  /** URL de servidor a servidor donde SumUp notifica cambios de estado. */
  callbackUrl?: string;
}): Promise<{ id: string; checkoutUrl: string }> {
  if (!env.sumupApiKey || !env.sumupMerchantCode) {
    throw new Error("SumUp no está configurado (falta SUMUP_API_KEY o SUMUP_MERCHANT_CODE)");
  }

  const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.sumupApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: params.reference,
      amount: Number((params.amountCents / 100).toFixed(2)),
      currency: params.currency.toUpperCase(),
      merchant_code: env.sumupMerchantCode,
      description: params.description ?? "Compra en REBELYN",
      redirect_url: params.returnUrl,
      return_url: params.callbackUrl ?? params.returnUrl,
      hosted_checkout: { enabled: true },
    }),
  });

  if (!res.ok) {
    const detail = await sumupErrorDetail(res);
    if (res.status === 401) {
      throw new Error(
        "La clave de API de SumUp no es válida o ha caducado (HTTP 401). Genera una nueva API key en el portal de desarrolladores de SumUp y actualiza la variable SUMUP_API_KEY en Vercel.",
      );
    }
    if (res.status === 403) {
      throw new Error(
        "SumUp no acepta la petición (HTTP 403): revisa que SUMUP_MERCHANT_CODE corresponda a la cuenta de la clave API en Vercel.",
      );
    }
    throw new Error(`SumUp rechazó crear el pago (HTTP ${res.status}): ${detail}`);
  }

  const data = (await res.json()) as SumupCheckout;
  const checkoutUrl = data.hosted_checkout_url ?? data.checkout_url ?? null;
  if (!checkoutUrl) {
    throw new Error(
      `SumUp no devolvió la URL de pago (estado: ${data.status ?? "desconocido"}). Revisa que la clave API tenga permisos de pagos online.`,
    );
  }
  return { id: data.id, checkoutUrl };
}

/**
 * Consulta en el servidor el estado REAL de un checkout de SumUp.
 * Se usa para verificar el pago antes de registrar el pedido (nunca se confía
 * en parámetros del navegador).
 */
export async function fetchSumupCheckout(checkoutId: string): Promise<SumupCheckout | null> {
  if (!env.sumupApiKey) return null;
  const res = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${env.sumupApiKey}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as SumupCheckout;
}

export const sumupProvider: PaymentProvider = {
  id: "sumup",
  displayName: "Tarjeta / SumUp",

  isConfigured(): boolean {
    return Boolean(env.sumupApiKey && env.sumupMerchantCode);
  },

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!env.sumupApiKey || !env.sumupMerchantCode) {
      throw new Error("SumUp no está configurado (falta SUMUP_API_KEY o SUMUP_MERCHANT_CODE)");
    }

    const checkoutBody = {
      checkout_reference: input.orderNumber,
      amount: Number((input.amountCents / 100).toFixed(2)),
      currency: input.currency.toUpperCase(),
      merchant_code: env.sumupMerchantCode,
      description: input.description ?? `Pedido ${input.orderNumber}`,
      return_url: `${env.storeUrl}/api/webhooks/sumup`,
      redirect_url: `${env.storeUrl}/success?order=${encodeURIComponent(input.orderNumber)}`,
      hosted_checkout: { enabled: true },
    };

    const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.sumupApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutBody),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error al crear checkout de SumUp: ${text}`);
    }

    const data = (await res.json()) as SumupCheckout;

    const existing = await db.payment.findFirst({
      where: { orderId: input.orderId, status: { in: ["REQUIRES_PAYMENT", "FAILED"] } },
    });

    const checkoutUrl = data.hosted_checkout_url ?? data.checkout_url ?? "";

    if (existing) {
      await db.payment.update({
        where: { id: existing.id },
        data: {
          provider: "sumup",
          status: "REQUIRES_PAYMENT",
          amountCents: input.amountCents,
          paymentIntentId: data.id,
          clientSecret: checkoutUrl || null,
        },
      });
    } else {
      await db.payment.create({
        data: {
          orderId: input.orderId,
          provider: "sumup",
          status: "REQUIRES_PAYMENT",
          amountCents: input.amountCents,
          paymentIntentId: data.id,
          clientSecret: checkoutUrl || null,
        },
      });
    }

    if (!checkoutUrl) throw new Error("SumUp no devolvió la URL de pago (hosted_checkout_url)");

    return {
      clientSecret: checkoutUrl,
      publishableKey: "",
      paymentId: existing?.id ?? "",
    };
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!env.sumupApiKey) return { ok: false, error: "SumUp no está configurado" };

    try {
      const res = await fetch(`https://api.sumup.com/v0.1/me/transactions/${input.paymentIntentId}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.sumupApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: input.amountCents ? Number((input.amountCents / 100).toFixed(2)) : undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: text };
      }

      const data = (await res.json()) as { id?: string };
      return { ok: true, refundId: data.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Error al reembolsar con SumUp" };
    }
  },
};
