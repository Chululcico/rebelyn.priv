import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSettings, DEFAULT_SETTINGS, type ShippingMethod } from "@/lib/settings";

export const runtime = "nodejs";

const patchSchema = z.object({
  standardPriceCents: z.number().int().min(0).max(99999),
  expressPriceCents: z.number().int().min(0).max(99999),
});

/**
 * Envíos con PRECIO FIJO (Estándar y Express).
 * GET: métodos activos con sus precios actuales.
 * PATCH: actualiza SOLO el precio de "standard" y "express" en la
 * configuración de la tienda; el resto (nombres, plazos, gratis desde)
 * se mantiene intacto. El checkout usa estos precios directamente.
 */
export const GET = withApi(async () => {
  await requireAdmin();
  const settings = await getSettings();
  return NextResponse.json({ methods: settings.shippingMethods.filter((m) => m.active) });
});

export const PATCH = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const input = patchSchema.parse(await readJson(request));

    // Leer el valor actual completo y tocar SOLO los dos precios.
    const row = await db.setting.findUnique({ where: { key: "shippingMethods" } });
    const current: ShippingMethod[] = Array.isArray(row?.value)
      ? (row.value as ShippingMethod[]).filter(
          (m) => m && typeof m.id === "string" && typeof m.priceCents === "number",
        )
      : DEFAULT_SETTINGS.shippingMethods;

    let updated = current.map((m) =>
      m.id === "standard"
        ? { ...m, priceCents: input.standardPriceCents }
        : m.id === "express"
          ? { ...m, priceCents: input.expressPriceCents }
          : m,
    );

    // Garantizar que existan siempre los dos métodos base.
    if (!updated.some((m) => m.id === "standard")) {
      updated = [...updated, { ...DEFAULT_SETTINGS.shippingMethods[0], priceCents: input.standardPriceCents }];
    }
    if (!updated.some((m) => m.id === "express")) {
      updated = [...updated, { ...DEFAULT_SETTINGS.shippingMethods[1], priceCents: input.expressPriceCents }];
    }

    await db.setting.upsert({
      where: { key: "shippingMethods" },
      create: { key: "shippingMethods", value: updated as never },
      update: { value: updated as never },
    });

    await audit({
      adminUserId: admin.id,
      action: "shipping.methods.update",
      entity: "Setting",
      entityId: "shippingMethods",
      before: current,
      after: updated,
    });

    return NextResponse.json({ ok: true, methods: updated.filter((m) => m.active) });
  },
  { rateLimit: { limit: 20, windowMs: 60 * 1000, key: "admin-shipping-methods" } },
);
