import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { discountInputSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi<Ctx>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = discountInputSchema.partial().parse(await readJson(request));

  const existing = await db.discount.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 });

  const discount = await db.discount.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt ? new Date(input.startsAt) : null } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
      ...(input.minOrderCents !== undefined ? { minOrderCents: input.minOrderCents } : {}),
      ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.appliesToAll !== undefined ? { appliesToAll: input.appliesToAll } : {}),
      ...(input.productIds !== undefined ? { productIds: input.productIds } : {}),
      ...(input.categoryIds !== undefined ? { categoryIds: input.categoryIds } : {}),
    },
  });

  await audit({ adminUserId: admin.id, action: "discount.update", entity: "Discount", entityId: id });
  return NextResponse.json({ discount });
});

export const DELETE = withApi<Ctx>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await db.discount.delete({ where: { id } });
  await audit({ adminUserId: admin.id, action: "discount.delete", entity: "Discount", entityId: id });
  return NextResponse.json({ ok: true });
});
