import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getShippingConfig, saveShippingConfig, DEFAULT_CORREOS_CONFIG, type CorreosShippingConfig } from "@/lib/shipping/config";
import { z } from "zod";

export const runtime = "nodejs";

const schema: z.ZodType<CorreosShippingConfig> = z.object({
  enabled: z.boolean(),
  mode: z.enum(["TARIFF_TABLE", "API"]),
  origin: z.object({
    name: z.string().max(120),
    address: z.string().max(200),
    city: z.string().max(80),
    province: z.string().max(80),
    postalCode: z.string().regex(/^\d{5}$/),
    country: z.string().max(2),
  }),
  enabledServices: z.array(z.string().max(60)).max(30),
  volumetricDivisor: z.number().int().min(1000).max(20000),
  marginPercent: z.number().min(0).max(500),
  marginFixedCents: z.number().int().min(0).max(100000),
  globalFreeShippingOverCents: z.number().int().min(0).nullable(),
  tariffSourceLabel: z.enum(["PUBLIC", "CONTRACT", "MIXED", "MANUAL"]),
  correosClientId: z.string().max(300).optional().or(z.literal("")),
  correosClientSecret: z.string().max(500).optional().or(z.literal("")),
  correosCustomerNumber: z.string().max(120).optional().or(z.literal("")),
  correosContractNumber: z.string().max(120).optional().or(z.literal("")),
  correosLabellerCode: z.string().max(120).optional().or(z.literal("")),
  apiVerified: z.boolean(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const GET = withApi(async () => {
  await requireAdmin();
  const config = await getShippingConfig();
  // No exponer secretos completos innecesariamente en logs; pero el admin los necesita para editar.
  return NextResponse.json({ config, defaults: DEFAULT_CORREOS_CONFIG });
});

export const PATCH = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const input = schema.parse(await readJson(request));
    // Seguridad: nunca activar modo API como "verificado" sin revisión explícita.
    if (input.mode === "API" && input.apiVerified) {
      // Permitimos guardar el flag solo si admin lo marca conscientemente; la lógica del motor igualmente no simula.
    }
    await saveShippingConfig(input, admin.id);
    await audit({ adminUserId: admin.id, action: "shipping.config.update", entity: "Setting", after: { key: "shippingCorreosConfig" } });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 20, windowMs: 60 * 1000, key: "admin-shipping-config" } },
);
