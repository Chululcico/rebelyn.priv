import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  carrier: z.string().max(40).optional(),
  serviceCode: z.string().max(60).optional(),
  serviceName: z.string().max(120).optional(),
  zone: z.string().max(30).optional(),
  minGrams: z.number().int().min(0).optional(),
  maxGrams: z.number().int().min(1).optional(),
  basePriceCents: z.number().int().min(0).optional(),
  currency: z.string().max(3).optional(),
  source: z.string().max(20).optional(),
  deliveryType: z.string().max(30).optional(),
  estimatedDays: z.string().max(80).optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi<Ctx>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = patchSchema.parse(await readJson(request));
  const before = await db.shippingRate.findUnique({ where: { id } });
  const rate = await db.shippingRate.update({ where: { id }, data: input });
  await audit({ adminUserId: admin.id, action: "shipping.rate.update", entity: "ShippingRate", entityId: id, before: before ?? undefined, after: rate });
  return NextResponse.json({ ok: true, rate });
});

export const DELETE = withApi<Ctx>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const before = await db.shippingRate.findUnique({ where: { id } });
  await db.shippingRate.delete({ where: { id } });
  await audit({ adminUserId: admin.id, action: "shipping.rate.delete", entity: "ShippingRate", entityId: id, before: before ?? undefined });
  return NextResponse.json({ ok: true });
});
