import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export type CorreosShippingConfig = {
  enabled: boolean;
  mode: "TARIFF_TABLE" | "API"; // API = solo si se verifica contrato/endpoints reales; no simulado
  origin: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    country: string; // ES
  };
  // Servicios habilitados (solo estos se muestran si hay tarifa). Códigos internos.
  enabledServices: string[]; // ej: PAQ_ESTANDAR, PAQ_PREMIUM, OFICINA, CITYPAQ
  volumetricDivisor: number; // configurable; usado para peso volumétrico
  marginPercent: number; // margen sobre tarifa base (0-100)
  marginFixedCents: number; // margen fijo adicional
  globalFreeShippingOverCents: number | null; // envío gratis desde X (subtotal)
  tariffSourceLabel: "PUBLIC" | "CONTRACT" | "MIXED" | "MANUAL";
  // Credenciales Correos (NO exponer al cliente). Se recomienda usar variables de entorno en producción.
  // Si se guardan en BD, deben tratarse como sensibles y solo gestionarse por admin server-side.
  correosClientId?: string;
  correosClientSecret?: string;
  correosCustomerNumber?: string;
  correosContractNumber?: string;
  correosLabellerCode?: string;
  apiVerified: boolean; // true solo si se ha verificado integración real (nunca por defecto)
  notes?: string;
};

export const DEFAULT_CORREOS_CONFIG: CorreosShippingConfig = {
  enabled: true,
  mode: "TARIFF_TABLE",
  origin: {
    name: "REBELYN",
    address: "Origen almacén",
    city: "Elda",
    province: "Alicante",
    postalCode: "03600",
    country: "ES",
  },
  enabledServices: ["PAQ_ESTANDAR", "PAQ_PREMIUM", "OFICINA", "CITYPAQ"],
  volumetricDivisor: 5000,
  marginPercent: 0,
  marginFixedCents: 0,
  globalFreeShippingOverCents: 7500,
  tariffSourceLabel: "MANUAL",
  apiVerified: false,
};

export async function getShippingConfig(): Promise<CorreosShippingConfig> {
  try {
    const row = await db.setting.findUnique({ where: { key: "shippingCorreosConfig" } });
    if (!row?.value || typeof row.value !== "object") return DEFAULT_CORREOS_CONFIG;
    return { ...DEFAULT_CORREOS_CONFIG, ...(row.value as Partial<CorreosShippingConfig>) };
  } catch {
    return DEFAULT_CORREOS_CONFIG;
  }
}

export async function saveShippingConfig(config: CorreosShippingConfig, adminUserId?: string) {
  await db.setting.upsert({
    where: { key: "shippingCorreosConfig" },
    create: { key: "shippingCorreosConfig", value: config as never },
    update: { value: config as never },
  });
}
