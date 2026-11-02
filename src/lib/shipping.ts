import "server-only";
import { getSettings, type ShippingMethod } from "@/lib/settings";

export type ShippingQuote = {
  methodId: string;
  name: string;
  priceCents: number;
  estimatedDays: string;
  freeApplied: boolean;
};

/** Calcula el envío según los métodos activos de la configuración. */
export async function quoteShipping(subtotalCents: number, methodId = "standard"): Promise<ShippingQuote | null> {
  const settings = await getSettings();
  const method = settings.shippingMethods.find((m) => m.id === methodId && m.active)
    ?? settings.shippingMethods.find((m) => m.active);
  if (!method) return null;

  const freeApplied = method.freeOverCents != null && subtotalCents >= method.freeOverCents;
  return {
    methodId: method.id,
    name: method.name,
    priceCents: freeApplied ? 0 : method.priceCents,
    estimatedDays: method.estimatedDays,
    freeApplied,
  };
}

export async function listShippingMethods(): Promise<ShippingMethod[]> {
  const settings = await getSettings();
  return settings.shippingMethods.filter((m) => m.active);
}
