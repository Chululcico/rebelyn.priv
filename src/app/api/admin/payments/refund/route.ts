import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { refundSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { audit } from "@/lib/audit";
import { restoreStock } from "@/lib/stock";

export const runtime = "nodejs";

/**
 * Reembolso desde el panel. Usa el provider de pago (Stripe). El estado final
 * se confirma además con el webhook charge.refunded (idempotente).
 */
export const POST = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const input = refundSchema.parse(await readJson(request));

    const payment = await db.payment.findUnique({
      where: { id: input.paymentId },
      include: { order: { include: { items: true } }, refunds: true },
    });
    if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
      return NextResponse.json({ error: "Este pago no se puede reembolsar" }, { status: 400 });
    }

    const alreadyRefunded = payment.refunds
      .filter((r) => r.status === "SUCCEEDED" || r.status === "PENDING")
      .reduce((sum, r) => sum + r.amountCents, 0);
    const maxRefundable = payment.amountCents - alreadyRefunded;
    const amount = input.amountCents ?? maxRefundable;
    if (amount <= 0 || amount > maxRefundable) {
      return NextResponse.json({ error: `Importe máximo reembolsable: ${(maxRefundable / 100).toFixed(2)} €` }, { status: 400 });
    }

    if (!payment.paymentIntentId) {
      return NextResponse.json({ error: "Este pago no tiene Payment Intent asociado" }, { status: 400 });
    }

    const provider = getPaymentProvider(payment.provider);
    if (!provider) return NextResponse.json({ error: "Proveedor de pago no configurado" }, { status: 503 });

    const fullRefund = amount >= payment.amountCents;
    const refundRecord = await db.refund.create({
      data: {
        paymentId: payment.id,
        amountCents: amount,
        reason: input.reason || null,
        status: "PENDING",
        adminUserId: admin.id,
      },
    });

    const result = await provider.refund({ paymentIntentId: payment.paymentIntentId, amountCents: fullRefund ? undefined : amount, reason: input.reason });

    if (!result.ok) {
      await db.refund.update({ where: { id: refundRecord.id }, data: { status: "FAILED" } });
      return NextResponse.json({ error: result.error ?? "Error al reembolsar" }, { status: 502 });
    }

    await db.refund.update({
      where: { id: refundRecord.id },
      data: { status: "SUCCEEDED", stripeRefundId: result.refundId ?? null },
    });

    const refundedTotal = alreadyRefunded + amount;
    await db.payment.update({
      where: { id: payment.id },
      data: { status: refundedTotal >= payment.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });

    if (fullRefund) {
      await db.order.update({ where: { id: payment.orderId }, data: { status: "REFUNDED" } });
      // Reponer stock al reembolsar la totalidad.
      await db.$transaction(async (tx) =>
        restoreStock(tx, payment.order.items.map((i) => ({ variantId: i.variantId, qty: i.qty })), `Reembolso pedido ${payment.order.orderNumber}`, admin.id),
      );
    }

    await audit({
      adminUserId: admin.id,
      action: "payment.refund",
      entity: "Payment",
      entityId: payment.id,
      after: { amountCents: amount, fullRefund },
    });

    return NextResponse.json({ ok: true, refundId: result.refundId, fullRefund });
  },
  { rateLimit: { limit: 20, windowMs: 60 * 60 * 1000, key: "admin-refund" } },
);
