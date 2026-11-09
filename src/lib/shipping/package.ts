// Cálculo de paquete (peso real, peso volumétrico) a partir del carrito.
// Los datos logísticos por artículo vienen de Product/ProductVariant (o defaults).

import type { Prisma } from "@prisma/client";

export type PackageInputItem = {
  qty: number;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type PackageSummary = {
  itemCount: number;
  actualWeightGrams: number;
  volumetricWeightGrams: number;
  billableWeightGrams: number;
  // Dimensiones agregadas (aproximación simple: suma de alturas para apilado, máximos de largo/ancho).
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  divisor: number;
};

export function computePackage(items: PackageInputItem[], volumetricDivisor = 5000): PackageSummary {
  const safeDiv = volumetricDivisor > 0 ? volumetricDivisor : 5000;
  let actual = 0;
  let volCm3 = 0;
  let maxL = 0;
  let maxW = 0;
  let sumH = 0;
  let count = 0;
  for (const it of items) {
    const q = Math.max(0, Math.floor(it.qty || 0));
    if (q <= 0) continue;
    count += q;
    const w = Math.max(1, Math.floor(it.weightGrams || 0));
    const l = Math.max(1, Math.floor(it.lengthCm || 0));
    const wi = Math.max(1, Math.floor(it.widthCm || 0));
    const h = Math.max(1, Math.floor(it.heightCm || 0));
    actual += w * q;
    volCm3 += l * wi * h * q;
    maxL = Math.max(maxL, l);
    maxW = Math.max(maxW, wi);
    sumH += h * q;
  }
  const volumetric = Math.ceil((volCm3 / safeDiv) * 1000); // cm3/divisor -> kg*? standard: (L*W*H)/divisor = kg; convert to grams
  // Common formula: volumetric kg = (Lcm*Wcm*Hcm)/divisor. So grams = (cm3/divisor)*1000
  const billable = Math.max(actual, volumetric, count > 0 ? 1 : 0);
  return {
    itemCount: count,
    actualWeightGrams: actual,
    volumetricWeightGrams: volumetric,
    billableWeightGrams: billable,
    lengthCm: maxL,
    widthCm: maxW,
    heightCm: sumH,
    divisor: safeDiv,
  };
}
