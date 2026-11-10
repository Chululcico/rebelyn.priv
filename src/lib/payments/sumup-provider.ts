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
  checkout_url?: string;
};

/**
 * Crea un checkout hospedado de SumUp SIN crear aún ningún pedido.
 * Devuelve la URL a la que redirigir al cliente para pagar con tarjeta.
 */
export async function createSumupCheckout(params: {
  reference: string;
  amountCents: number;
  currency: string;
  description?: string;
  returnUrl: string;
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
      return_url: params.returnUrl,
      redirect_url: params.returnUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al crear checkout de SumUp: ${text}`);
  }

  const data = (await res.json()) as SumupCheckout;
  if (!data.checkout_url) throw new Error("SumUp no devolvió la URL de pago");
  return { id: data.id, checkoutUrl: data.checkout_url };
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
      return_url: `${env.storeUrl}/success?order=${encodeURIComponent(input.orderNumber)}`,
      redirect_url: `${env.storeUrl}/success?order=${encodeURIComponent(input.orderNumber)}`,
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

    const data = (await res.json()) as {
      id: string;
      checkout_reference: string;
      amount: number;
      currency: string;
      status: string;
      checkout_url?: string;
    };

    const existing = await db.payment.findFirst({
      where: { orderId: input.orderId, status: { in: ["REQUIRES_PAYMENT", "FAILED"] } },
    });

    if (existing) {
      await db.payment.update({
        where: { id: existing.id },
        data: {
          provider: "sumup",
          status: "REQUIRES_PAYMENT",
          amountCents: input.amountCents,
          paymentIntentId: data.id,
          clientSecret: data.checkout_url ?? null,
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
          clientSecret: data.checkout_url ?? null,
        },
      });
    }

    return {
      clientSecret: data.checkout_url ?? "",
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
