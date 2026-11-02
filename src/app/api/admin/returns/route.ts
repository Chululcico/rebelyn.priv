import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { restoreStock } from "@/lib/stock";
import { getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

export const GET = withApi(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const returns = await db.returnRequest.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { order: { select: { orderNumber: true, email: true, shipName: true, totalCents: true } }, items: { include: { orderItem: true } } },
  });

  return NextResponse.json({ returns });
});

const actionSchema = z.object({
  returnId: z.string().min(6).max(64),
  action: z.enum(["APPROVE", "REJECT", "RECEIVE", "REFUND"]),
  adminNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** Gestión de devoluciones: aprobar → recibir → reembolsar (vuelve el stock). */
export const PATCH = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const { returnId, action, adminNote } = actionSchema.parse(await readJson(request));

    const ret = await db.returnRequest.findUnique({
      where: { id: returnId },
      include: { order: { include: { items: true, payments: true } }, items: { include: { orderItem: true } } },
    });
    if (!ret) return NextResponse.json({ error: "Devolución no encontrada" }, { status: 404 });

    const transitions: Record<string, string[]> = {
      APPROVE: ["REQUESTED"],
      REJECT: ["REQUESTED"],
      RECEIVE: ["APPROVED"],
      REFUND: ["RECEIVED"],
    };
    if (!transitions[action].includes(ret.status)) {
      return NextResponse.json({ error: `No se puede ${action} una devolución en estado ${ret.status}` }, { status: 400 });
    }

    if (action === "REJECT") {
      await db.returnRequest.update({ where: { id: ret.id }, data: { status: "REJECTED", adminNote: adminNote || null } });
    } else if (action === "APPROVE") {
      await db.returnRequest.update({ where: { id: ret.id }, data: { status: "APPROVED", adminNote: adminNote || null } });
    } else if (action === "RECEIVE") {
      await db.returnRequest.update({ where: { id: ret.id }, data: { status: "RECEIVED", adminNote: adminNote || null } });
    } else {
      // REFUND: reembolsar por Stripe el importe de los artículos devueltos.
      const amount = ret.items.reduce((sum, i) => sum + i.orderItem.unitPriceCents * i.qty, 0);
      const payment = ret.order.payments.find((p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED");

      if (payment?.paymentIntentId) {
        const provider = getPaymentProvider(payment.provider);
        if (provider) {
          const result = await provider.refund({ paymentIntentId: payment.paymentIntentId, amountCents: amount, reason: "Devolución" });
          if (!result.ok) return NextResponse.json({ error: result.error ?? "Error al reembolsar" }, { status: 502 });

          await db.refund.create({
            data: { paymentId: payment.id, amountCents: amount, reason: `Devolución ${ret.order.orderNumber}`, status: "SUCCEEDED", stripeRefundId: result.refundId ?? null, adminUserId: admin.id },
          });

          const refunded = await db.refund.aggregate({ where: { paymentId: payment.id, status: "SUCCEEDED" }, _sum: { amountCents: true } });
          const total = (refunded._sum.amountCents ?? 0) + amount;
          await db.payment.update({
            where: { id: payment.id },
            data: { status: total >= payment.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" },
          });
          if (total >= payment.amountCents) {
            await db.order.update({ where: { id: ret.orderId }, data: { status: "REFUNDED" } });
          }
        }
      }

      // Reponer stock de las prendas devueltas.
      await db.$transaction(async (tx) =>
        restoreStock(tx, ret.items.map((i) => ({ variantId: i.orderItem.variantId, qty: i.qty })), `Devolución ${ret.order.orderNumber}`, admin.id),
      );
      await db.returnRequest.update({ where: { id: ret.id }, data: { status: "REFUNDED", adminNote: adminNote || null } });
    }

    await audit({ adminUserId: admin.id, action: `return.${action.toLowerCase()}`, entity: "ReturnRequest", entityId: ret.id });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000, key: "admin-returns" } },
);
