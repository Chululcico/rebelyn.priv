import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { discountInputSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = withApi(async () => {
  await requireAdmin();
  const discounts = await db.discount.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { usages: true } } } });
  return NextResponse.json({ discounts });
});

export const POST = withApi(async (request: Request) => {
  const admin = await requireAdmin();
  const input = discountInputSchema.parse(await readJson(request));

  const exists = await db.discount.findUnique({ where: { code: input.code.toUpperCase() } });
  if (exists) return NextResponse.json({ error: "Ya existe un código con ese nombre" }, { status: 409 });

  const discount = await db.discount.create({
    data: {
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      minOrderCents: input.minOrderCents,
      maxUses: input.maxUses ?? null,
      active: input.active,
      appliesToAll: input.appliesToAll,
      productIds: input.productIds,
      categoryIds: input.categoryIds,
    },
  });

  await audit({ adminUserId: admin.id, action: "discount.create", entity: "Discount", entityId: discount.id, after: { code: discount.code } });
  return NextResponse.json({ discount }, { status: 201 });
});
