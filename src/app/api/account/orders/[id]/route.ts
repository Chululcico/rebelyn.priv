import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export const GET = withApi(async (_request: Request, ctx: Params) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const order = await db.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true, payments: { select: { provider: true, status: true, method: true } } },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  return NextResponse.json({ order });
});
