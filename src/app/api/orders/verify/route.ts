import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { finalizeDraftOrder } from "@/lib/orders";
import { fetchSumupCheckout } from "@/lib/payments/sumup-provider";

export const runtime = "nodejs";

const schema = z.object({ draftId: z.string().trim().min(6).max(64) });

/**
 * PAGO PRIMERO → PEDIDO DESPUÉS (retorno del navegador desde SumUp).
 * Recibe el id del borrador y:
 *  1. Si el pedido ya existe → devuelve el resumen (idempotente).
 *  2. Consulta el estado REAL del checkout en SumUp (server-to-server;
 *     nunca se confía en parámetros del navegador).
 *  3. Si está PAGADO y el importe coincide → crea el pedido y devuelve
 *     número + resumen.
 */
export const POST = withApi(
  async (request: Request) => {
    const { draftId } = schema.parse(await readJson(request));
    const draft = await db.checkoutDraft.findUnique({ where: { id: draftId } });
    if (!draft) return NextResponse.json({ ok: false, reason: "not_found", error: "No encontramos tu pago." }, { status: 404 });

    // Ya finalizado por otra vía (p. ej. el webhook llegó antes): devolver pedido.
    if (draft.orderId) return summaryResponse(draft.orderId);

    if (draft.status === "FAILED") {
      return NextResponse.json(
        { ok: false, reason: "failed", error: draft.failureReason ?? "El pago no se completó. Tu carrito sigue intacto para volver a intentarlo." },
        { status: 409 },
      );
    }

    if (!draft.providerCheckoutId) {
      return NextResponse.json({ ok: false, reason: "pending", error: "El pago aún no se ha iniciado." }, { status: 409 });
    }

    // Verificación server-to-server con SumUp.
    const checkout = await fetchSumupCheckout(draft.providerCheckoutId);
    const providerStatus = String(checkout?.status ?? "").toUpperCase();

    if (!checkout || !providerStatus.includes("PAID")) {
      const failed = providerStatus.includes("FAILED") || providerStatus.includes("EXPIRED") || providerStatus.includes("CANCEL");
      if (failed) {
        await db.checkoutDraft
          .update({ where: { id: draft.id }, data: { status: "FAILED", failureReason: `SumUp: ${providerStatus}` } })
          .catch(() => undefined);
        return NextResponse.json(
          { ok: false, reason: "failed", error: "El pago no se completó. Tu carrito sigue intacto para volver a intentarlo." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { ok: false, reason: "pending", error: "Tu pago todavía no consta como confirmado. Si acabas de pagar, espera unos segundos y vuelve a comprobar." },
        { status: 202 },
      );
    }

    // El importe pagado debe coincidir EXACTAMENTE con el del borrador.
    const paidCents = Math.round(Number(checkout.amount) * 100);
    if (paidCents !== draft.amountCents) {
      await db.checkoutDraft
        .update({
          where: { id: draft.id },
          data: { status: "FAILED", failureReason: `Importe pagado ${paidCents} céntimos ≠ esperado ${draft.amountCents}` },
        })
        .catch(() => undefined);
      console.error(`[verify] Importe no coincide en borrador ${draft.id}: pagado=${paidCents} esperado=${draft.amountCents}`);
      return NextResponse.json(
        { ok: false, reason: "amount_mismatch", error: "El importe pagado no coincide con el pedido. Contáctanos en hola@rebelyn.net." },
        { status: 409 },
      );
    }

    const result = await finalizeDraftOrder(draft.id);
    if ("error" in result) return NextResponse.json({ ok: false, reason: "error", error: result.error }, { status: 409 });
    return summaryResponse(result.orderId);
  },
  { csrf: false, rateLimit: { limit: 30, windowMs: 60 * 1000, key: "draft-verify" } },
);

async function summaryResponse(orderId: string): Promise<Response> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { select: { provider: true, status: true, method: true } } },
  });
  if (!order) return NextResponse.json({ ok: false, reason: "not_found", error: "Pedido no encontrado." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paidAt: order.paidAt,
      trackingNumber: order.trackingNumber,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      shipName: order.shipName,
      shipLine1: order.shipLine1,
      shipLine2: order.shipLine2,
      shipCity: order.shipCity,
      shipProvince: order.shipProvince,
      shipPostalCode: order.shipPostalCode,
      shipCountry: order.shipCountry,
      paymentMethod: order.payments[0]?.method ?? order.payments[0]?.provider ?? null,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        size: i.size,
        colorName: i.colorName,
        qty: i.qty,
        totalCents: i.totalCents,
        imageUrl: i.imageUrl,
      })),
    },
  });
}
