import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, RefundInput, RefundResult } from "./types";

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
