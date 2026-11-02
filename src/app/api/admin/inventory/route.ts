import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { stockAdjustSchema } from "@/lib/validate";
import { adjustStock } from "@/lib/stock";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const input = stockAdjustSchema.parse(await readJson(request));

    const stock = await adjustStock({
      variantId: input.variantId,
      delta: input.delta,
      reason: input.reason,
      adminUserId: admin.id,
    });

    await audit({ adminUserId: admin.id, action: "inventory.adjust", entity: "ProductVariant", entityId: input.variantId, after: { delta: input.delta, stock } });
    return NextResponse.json({ ok: true, stock });
  },
  { rateLimit: { limit: 120, windowMs: 60 * 1000, key: "admin-stock" } },
);

export const GET = withApi(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const variantId = url.searchParams.get("variantId");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 50;

  const where = variantId ? { variantId } : {};
  const [movements, total] = await Promise.all([
    db.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { variant: { include: { product: { select: { name: true } }, color: true } }, adminUser: { select: { email: true } } },
    }),
    db.inventoryMovement.count({ where }),
  ]);

  return NextResponse.json({ movements, total, page, perPage });
});
