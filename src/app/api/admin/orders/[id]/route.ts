import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { orderStatusSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { cancelOrder } from "@/lib/orders";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" }, include: { refunds: true } }, returns: { include: { items: true } }, user: { select: { email: true, name: true } } },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  return NextResponse.json({ order });
});

export const PATCH = withApi<Ctx>(
  async (request, { params }) => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = orderStatusSchema.parse(await readJson(request));

    const order = await db.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    if (input.status === "CANCELLED" && ["PAID", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return NextResponse.json({ error: "Usa el botón de reembolso para pedidos ya pagados" }, { status: 400 });
    }

    if (input.status === "CANCELLED") {
      await cancelOrder(id, admin.id, "Cancelado desde el panel");
    } else {
      await db.order.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber || null } : {}),
          ...(input.status === "SHIPPED" ? { shippedAt: new Date() } : {}),
        },
      });
    }

    await audit({ adminUserId: admin.id, action: "order.status", entity: "Order", entityId: id, before: { status: order.status }, after: { status: input.status } });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 60, windowMs: 60 * 1000, key: "admin-order-status" } },
);
