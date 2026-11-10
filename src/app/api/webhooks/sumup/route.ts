import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { finalizeDraftOrder } from "@/lib/orders";
import { fetchSumupCheckout } from "@/lib/payments/sumup-provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false }, { status: 400 });

    const checkoutId = String(body.checkout_id || body.id || body.checkout?.id || body.transaction_id || "");
    const status = String(body.status || body.checkout?.status || body.event_type || "").toUpperCase();

    if (!checkoutId) return NextResponse.json({ ok: true });

    // ── Flujo actual: pago PRIMERO, pedido después ─────────────────────────────
    const draft = await db.checkoutDraft.findFirst({ where: { providerCheckoutId: checkoutId } });
    if (draft) {
      // El evento de SumUp (p. ej. CHECKOUT_STATUS_CHANGED) NO incluye el estado
      // del pago: su documentación exige verificar SIEMPRE contra la API real.
      const checkout = await fetchSumupCheckout(checkoutId);
      const providerStatus = String(checkout?.status ?? "").toUpperCase();

      if (!checkout) {
        // Fallo temporal al consultar SumUp: devolver error para que SumUp
        // reintente el webhook (reintenta a 1 min, 5 min, 20 min y 2 h).
        console.error(`[sumup-webhook] No se pudo verificar el checkout ${checkoutId} (borrador ${draft.id})`);
        return NextResponse.json({ ok: false }, { status: 500 });
      }

      if (providerStatus.includes("PAID")) {
        // Verificación server-to-server: el estado REAL en SumUp manda.
        const paidCents = Math.round(Number(checkout.amount) * 100);
        if (paidCents !== draft.amountCents) {
          await db.checkoutDraft
            .update({
              where: { id: draft.id },
              data: { status: "FAILED", failureReason: `Importe pagado ${paidCents} céntimos ≠ esperado ${draft.amountCents}` },
            })
            .catch(() => undefined);
          console.error(`[sumup-webhook] Importe no coincide en borrador ${draft.id}: pagado=${paidCents} esperado=${draft.amountCents}`);
          return NextResponse.json({ ok: true });
        }

        const result = await finalizeDraftOrder(draft.id);
        if ("error" in result) console.error("[sumup-webhook] Error finalizando borrador:", result.error);
        return NextResponse.json({ ok: true });
      }

      if (providerStatus.includes("FAILED") || providerStatus.includes("EXPIRED") || providerStatus.includes("CANCEL")) {
        // Pago fallido/cancelado: no se registra ningún pedido (el carrito sigue intacto).
        if (draft.status === "PENDING" || draft.status === "PROCESSING") {
          await db.checkoutDraft
            .update({ where: { id: draft.id }, data: { status: "FAILED", failureReason: `SumUp: ${providerStatus}` } })
            .catch(() => undefined);
        }
        return NextResponse.json({ ok: true });
      }

      // Estado intermedio (p. ej. PENDING): no hacer nada; SumUp volverá a avisar.
      return NextResponse.json({ ok: true });
    }

    // ── Flujo legacy: pedidos creados antes del pago (histórico) ───────────────
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
    console.error("[sumup-webhook] Error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
