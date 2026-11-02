import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export type ShippingMethod = {
  id: string;
  name: string;
  priceCents: number;
  freeOverCents: number | null;
  estimatedDays: string;
  active: boolean;
};

export type StoreSettings = {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  legalName: string;
  legalId: string;
  currency: string;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  shippingMethods: ShippingMethod[];
  social: { instagram?: string; tiktok?: string; whatsapp?: string };
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "REBELYN",
  contactEmail: "rebelynoff@gmail.com",
  contactPhone: "632 530 973",
  address: "[DIRECCIÓN]",
  legalName: "[NOMBRE LEGAL]",
  legalId: "[NIF]",
  currency: "EUR",
  taxRatePercent: 21,
  pricesIncludeTax: true,
  shippingMethods: [
    {
      id: "standard",
      name: "Envío estándar",
      priceCents: 490,
      freeOverCents: 7500,
      estimatedDays: "2–4 días laborables",
      active: true,
    },
    {
      id: "express",
      name: "Envío express",
      priceCents: 890,
      freeOverCents: null,
      estimatedDays: "24 horas laborables",
      active: true,
    },
  ],
  social: {
    instagram: "https://www.instagram.com/rebelyn.off/",
    tiktok: "https://www.tiktok.com/@rebelyn.off",
    whatsapp: "34632530973",
  },
};

/** Ajustes de tienda cacheados por request. Se editan desde /admin/settings. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const rows = await db.setting.findMany({ where: { key: { in: Object.keys(DEFAULT_SETTINGS) } } });
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key === "shippingMethods") {
      // Validación mínima: solo métodos con id y precio numérico.
      const methods = row.value as ShippingMethod[];
      if (Array.isArray(methods)) {
        merged.shippingMethods = methods.filter((m) => m && typeof m.id === "string" && typeof m.priceCents === "number");
      }
    } else {
      merged[row.key] = row.value;
    }
  }
  return merged as StoreSettings;
});
