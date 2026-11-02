import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { settingsSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export const GET = withApi(async () => {
  await requireAdmin();
  const settings = await getSettings();
  return NextResponse.json({ settings });
});

export const PATCH = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const input = settingsSchema.parse(await readJson(request));

    const entries: [string, unknown][] = [
      ["storeName", input.storeName],
      ["contactEmail", input.contactEmail],
      ["contactPhone", input.contactPhone],
      ["address", input.address],
      ["legalName", input.legalName],
      ["legalId", input.legalId],
      ["currency", input.currency],
      ["taxRatePercent", input.taxRatePercent],
      ["pricesIncludeTax", input.pricesIncludeTax],
      ["social", input.social],
      ["shippingMethods", input.shippingMethods],
    ];

    for (const [key, value] of entries) {
      await db.setting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } });
    }

    await audit({ adminUserId: admin.id, action: "settings.update", entity: "Setting", after: { keys: entries.map(([k]) => k) } });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 20, windowMs: 60 * 1000, key: "admin-settings" } },
);
