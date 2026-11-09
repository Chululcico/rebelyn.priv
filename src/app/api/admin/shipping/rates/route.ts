import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const rateSchema = z.object({
  carrier: z.string().max(40).default("CORREOS"),
  serviceCode: z.string().min(1).max(60),
  serviceName: z.string().min(1).max(120),
  zone: z.string().min(1).max(30),
  minGrams: z.number().int().min(0).max(10_000_000).default(0),
  maxGrams: z.number().int().min(1).max(10_000_000),
  basePriceCents: z.number().int().min(0).max(99_999_999),
  currency: z.string().max(3).default("EUR"),
  source: z.string().max(20).default("MANUAL"),
  deliveryType: z.string().max(30).default("DOMICILIO"),
  estimatedDays: z.string().max(80).optional().nullable(),
  active: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export const GET = withApi(async (request: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service") || undefined;
  const zone = searchParams.get("zone") || undefined;
  const rates = await db.shippingRate.findMany({
    where: {
      ...(service ? { serviceCode: service } : {}),
      ...(zone ? { zone } : {}),
    },
    orderBy: [{ carrier: "asc" }, { serviceCode: "asc" }, { zone: "asc" }, { minGrams: "asc" }],
    take: 500,
  });
  return NextResponse.json({ rates });
});

export const POST = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const body = await readJson(request);
    // Importación masiva: { import: [...] }
    if (body && typeof body === "object" && Array.isArray((body as any).import)) {
      const items = (body as any).import;
      const parsed = z.array(rateSchema).max(2000).parse(items);
      const replace = Boolean((body as any).replaceAll);
      if (replace) await db.shippingRate.deleteMany({ where: { carrier: parsed[0]?.carrier || "CORREOS" } }).catch(() => {});
      const created = await db.shippingRate.createMany({ data: parsed.map((p) => ({ ...p, estimatedDays: p.estimatedDays ?? null, notes: p.notes ?? null })) });
      await audit({ adminUserId: admin.id, action: "shipping.rates.import", entity: "ShippingRate", after: { count: created.count, replace } });
      return NextResponse.json({ ok: true, count: created.count });
    }
    const input = rateSchema.parse(body);
    const rate = await db.shippingRate.create({ data: { ...input, estimatedDays: input.estimatedDays ?? null, notes: input.notes ?? null } });
    await audit({ adminUserId: admin.id, action: "shipping.rate.create", entity: "ShippingRate", entityId: rate.id });
    return NextResponse.json({ ok: true, rate });
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000, key: "admin-shipping-rates" } },
);
