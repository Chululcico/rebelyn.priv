import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, readJson } from "@/lib/api";
import { returnRequestSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const body = await readJson<Record<string, unknown>>(request);
    const user = await getCurrentUser();

    // Usuario con sesión: el email es opcional; el pedido debe ser suyo.
    const input = returnRequestSchema
      .extend({ email: user ? returnRequestSchema.shape.email.or(z.literal("")).optional() : returnRequestSchema.shape.email })
      .parse(body);

    const order = await db.order.findFirst({
      where: {
        orderNumber: input.orderNumber,
        ...(input.email ? { email: input.email.toLowerCase() } : { userId: user!.id }),
      },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "No encontramos ese pedido con ese email" }, { status: 404 });

    if (["PENDING", "CANCELLED", "REFUNDED"].includes(order.status)) {
      return NextResponse.json({ error: "Este pedido no admite devoluciones en su estado actual" }, { status: 400 });
    }

    for (const item of input.items) {
      const orderItem = order.items.find((i) => i.id === item.orderItemId);
      if (!orderItem) return NextResponse.json({ error: "Una de las prendas no pertenece a ese pedido" }, { status: 400 });
    }

    const existing = await db.returnRequest.findFirst({ where: { orderId: order.id, status: { in: ["REQUESTED", "APPROVED"] } } });
    if (existing) return NextResponse.json({ error: "Ya hay una devolución abierta para este pedido" }, { status: 409 });

    await db.returnRequest.create({
      data: {
        orderId: order.id,
        requesterId: user?.id ?? null,
        reason: input.reason,
        items: { create: input.items.map((i) => ({ orderItemId: i.orderItemId, qty: i.qty })) },
      },
    });

    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 5, windowMs: 60 * 60 * 1000, key: "returns" } },
);
