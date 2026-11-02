import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, readJson } from "@/lib/api";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Consulta pública limitada de un pedido por número + email.
 * No devuelve datos de pago sensibles ni permite enumerar pedidos sin email.
 */
export const POST = withApi(
  async (request: Request) => {
    const input = schema.parse(await readJson(request));
    const order = await db.order.findFirst({
      where: { orderNumber: input.orderNumber, email: input.email },
      include: { items: true, payments: { select: { provider: true, status: true, method: true } } },
    });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
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
  },
  { csrf: false, rateLimit: { limit: 30, windowMs: 60 * 1000, key: "order-lookup" } },
);
