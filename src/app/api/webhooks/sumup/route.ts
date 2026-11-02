import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false }, { status: 400 });

    const checkoutId = body.checkout_id || body.id || body.checkout?.id || body.transaction_id;
    const status = String(body.status || body.checkout?.status || body.event_type || "").toUpperCase();

    if (!checkoutId) return NextResponse.json({ ok: true });

    const payment = await db.payment.findFirst({
      where: { paymentIntentId: checkoutId, provider: "sumup" },
      include: { order: true },
    });

    if (!payment || !payment.order) return NextResponse.json({ ok: true });

    if (status.includes("PAID") || status.includes("SUCCESS") || status.includes("COMPLET")) {
      if (payment.status !== "SUCCEEDED") {
        await db.$transaction([
          db.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCEEDED },
          }),
          db.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID, paidAt: new Date() },
          }),
        ]);
      }
      return NextResponse.json({ ok: true });
    }

    if (status.includes("FAILED") || status.includes("CANCEL") || status.includes("EXPIRED")) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
