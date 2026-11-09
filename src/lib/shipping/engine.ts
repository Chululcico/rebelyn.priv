import "server-only";
import { db } from "@/lib/db";
import { getShippingConfig } from "./config";
import { computePackage, type PackageInputItem, type PackageSummary } from "./package";
import { resolveSpainZone, isSpainDestination, type ShippingZone } from "./zones";
import { getSettings } from "@/lib/settings";

export type ShippingServiceQuote = {
  id: string; // service/rate identifier (for selection)
  serviceCode: string;
  serviceName: string;
  carrier: string;
  deliveryType: string;
  priceCents: number;
  basePriceCents: number;
  marginCents: number;
  estimatedDays: string | null;
  zone: string;
  source: string;
  freeApplied: boolean;
  package: PackageSummary;
};

export type QuoteRequest = {
  cartId?: string;
  destination: { postalCode: string; province?: string; country?: string };
  // Optional: precomputed subtotal to apply free-shipping rules consistently
  subtotalCents?: number;
};

export type QuoteResult = {
  ok: boolean;
  reason?: string;
  zone?: ShippingZone | null;
  package?: PackageSummary;
  services: ShippingServiceQuote[];
  mode: "TARIFF_TABLE" | "API" | "LEGACY";
  tariffSourceLabel?: string;
  origin: { city: string; province: string; postalCode: string };
};

async function getCartPackageAndSubtotal(cartId: string, volumetricDivisor: number) {
  const items = await db.cartItem.findMany({
    where: { cartId },
    include: { variant: { include: { product: { select: { weightGrams: true, lengthCm: true, widthCm: true, heightCm: true, status: true, priceCents: true } } } } },
  });
  const active = items.filter((i) => i.variant.product.status === "ACTIVE");
  const pkgItems: PackageInputItem[] = active.map((i) => ({
    qty: i.qty,
    weightGrams: i.variant.weightGrams ?? i.variant.product.weightGrams ?? 300,
    lengthCm: i.variant.lengthCm ?? i.variant.product.lengthCm ?? 30,
    widthCm: i.variant.widthCm ?? i.variant.product.widthCm ?? 20,
    heightCm: i.variant.heightCm ?? i.variant.product.heightCm ?? 5,
  }));
  const subtotalCents = active.reduce((sum, i) => {
    const unit = i.variant.priceCents ?? i.variant.product.priceCents;
    return sum + unit * i.qty;
  }, 0);
  return { package: computePackage(pkgItems, volumetricDivisor), subtotalCents, itemCount: active.reduce((s, i) => s + i.qty, 0) };
}

function applyPricing(basePriceCents: number, subtotalCents: number, cfg: { marginPercent: number; marginFixedCents: number; globalFreeShippingOverCents: number | null }) {
  const marginCents = Math.round((basePriceCents * (cfg.marginPercent || 0)) / 100) + (cfg.marginFixedCents || 0);
  let priceCents = Math.max(0, basePriceCents + marginCents);
  const freeApplied = cfg.globalFreeShippingOverCents != null && subtotalCents >= cfg.globalFreeShippingOverCents;
  if (freeApplied) priceCents = 0;
  return { priceCents, marginCents, freeApplied };
}

/** Cotiza servicios disponibles usando la tabla de tarifas (fallback principal). */
export async function quoteShippingServices(req: QuoteRequest): Promise<QuoteResult> {
  const cfg = await getShippingConfig();
  const origin = { city: cfg.origin.city, province: cfg.origin.province, postalCode: cfg.origin.postalCode };

  if (!cfg.enabled) {
    return { ok: false, reason: "Envíos deshabilitados", services: [], mode: "TARIFF_TABLE", origin };
  }
  if (!isSpainDestination(req.destination.country)) {
    return { ok: false, reason: "Solo se realizan envíos a España", services: [], mode: "TARIFF_TABLE", origin };
  }
  const zone = resolveSpainZone(req.destination.postalCode, req.destination.province);
  if (!zone) {
    return { ok: false, reason: "Código postal o provincia no válidos", services: [], mode: "TARIFF_TABLE", origin, zone };
  }

  let pkg: PackageSummary;
  let subtotalCents = req.subtotalCents ?? 0;
  if (req.cartId) {
    try {
      const info = await getCartPackageAndSubtotal(req.cartId, cfg.volumetricDivisor);
      pkg = info.package;
      if (req.subtotalCents == null) subtotalCents = info.subtotalCents;
      if (info.itemCount === 0) return { ok: false, reason: "Carrito vacío", services: [], mode: "TARIFF_TABLE", origin, zone, package: pkg };
    } catch {
      pkg = computePackage([], cfg.volumetricDivisor);
    }
  } else {
    pkg = computePackage([], cfg.volumetricDivisor);
  }

  // Modo API real: NO implementado/simulado sin verificación explícita.
  if (cfg.mode === "API") {
    if (!cfg.apiVerified) {
      return {
        ok: false,
        reason:
          "La cotización en tiempo real por API de Correos no está verificada/configurada. Se requiere acceso al Portal de Desarrolladores de Correos, credenciales válidas y contrato de transporte. Usa la tabla de tarifas configurable.",
        zone,
        package: pkg,
        services: [],
        mode: "API",
        tariffSourceLabel: cfg.tariffSourceLabel,
        origin,
      };
    }
    // Si algún día se verifica una API real de cotización, aquí iría el adaptador.
    // No se inventan endpoints.
  }

  // Tabla de tarifas
  try {
    const weight = Math.max(1, pkg.billableWeightGrams);
    const rates = await db.shippingRate.findMany({
      where: {
        active: true,
        carrier: "CORREOS",
        zone: { in: [zone, "ALL"] },
        minGrams: { lte: weight },
        maxGrams: { gte: weight },
      },
      orderBy: [{ basePriceCents: "asc" }, { serviceName: "asc" }],
    });

    const enabled = new Set((cfg.enabledServices || []).map((s) => s.toUpperCase()));
    const filtered = rates.filter((r) => enabled.size === 0 || enabled.has(r.serviceCode.toUpperCase()));

    // De-duplicar por servicio (quedarse con el mejor match/precio)
    const byService = new Map<string, (typeof filtered)[number]>();
    for (const r of filtered) {
      const key = `${r.serviceCode}:${r.deliveryType}`;
      if (!byService.has(key)) byService.set(key, r);
    }

    const services: ShippingServiceQuote[] = [...byService.values()].map((r) => {
      const priced = applyPricing(r.basePriceCents, subtotalCents, cfg);
      return {
        id: r.id,
        serviceCode: r.serviceCode,
        serviceName: r.serviceName,
        carrier: r.carrier,
        deliveryType: r.deliveryType,
        priceCents: priced.priceCents,
        basePriceCents: r.basePriceCents,
        marginCents: priced.marginCents,
        estimatedDays: r.estimatedDays ?? null,
        zone,
        source: r.source,
        freeApplied: priced.freeApplied,
        package: pkg,
      };
    });

    if (services.length === 0) {
      return {
        ok: false,
        reason: "No hay tarifas configuradas para este destino/peso/servicio. Revisa la tabla de tarifas en Gestión de envíos.",
        zone,
        package: pkg,
        services: [],
        mode: "TARIFF_TABLE",
        tariffSourceLabel: cfg.tariffSourceLabel,
        origin,
      };
    }

    return { ok: true, zone, package: pkg, services, mode: "TARIFF_TABLE", tariffSourceLabel: cfg.tariffSourceLabel, origin };
  } catch (e) {
    // Si la tabla no existe aún (schema no aplicado), fallback a métodos legacy.
    try {
      const settings = await getSettings();
      const methods = (settings.shippingMethods || []).filter((m) => m.active);
      const legacy: ShippingServiceQuote[] = methods.map((m) => {
        const freeApplied = m.freeOverCents != null && subtotalCents >= m.freeOverCents;
        return {
          id: `legacy:${m.id}`,
          serviceCode: m.id.toUpperCase(),
          serviceName: m.name,
          carrier: "LEGACY",
          deliveryType: "DOMICILIO",
          priceCents: freeApplied ? 0 : m.priceCents,
          basePriceCents: m.priceCents,
          marginCents: 0,
          estimatedDays: m.estimatedDays,
          zone,
          source: "MANUAL",
          freeApplied,
          package: pkg,
        };
      });
      return {
        ok: legacy.length > 0,
        reason: legacy.length ? undefined : "No hay métodos de envío disponibles.",
        zone,
        package: pkg,
        services: legacy,
        mode: "LEGACY",
        origin,
      };
    } catch {
      return { ok: false, reason: "Error al calcular envío", zone, package: pkg, services: [], mode: "TARIFF_TABLE", origin };
    }
  }
}

/** Valida una selección de envío recalculando en servidor (anti-manipulación). */
export async function validateShippingSelection(params: {
  cartId: string;
  destination: { postalCode: string; province?: string; country?: string };
  selectedId: string; // ShippingRate id o legacy:*
  selectedServiceCode?: string;
}) {
  const quote = await quoteShippingServices({ cartId: params.cartId, destination: params.destination });
  if (!quote.ok) return { ok: false as const, error: quote.reason || "Envío no disponible", quote };
  const match = quote.services.find((s) => s.id === params.selectedId) ||
    (params.selectedServiceCode ? quote.services.find((s) => s.serviceCode === params.selectedServiceCode) : null);
  if (!match) return { ok: false as const, error: "El método de envío seleccionado ya no es válido. Actualiza la página.", quote };
  return { ok: true as const, service: match, quote };
}
