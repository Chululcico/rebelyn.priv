// Zona de destino para envíos en España (incluye península, Baleares, Canarias, Ceuta, Melilla).
// Se usa para seleccionar tarifas de la tabla configurable. No depende de APIs externas.

export type ShippingZone = "PENINSULA" | "BALEARES" | "CANARIAS" | "CEUTA" | "MELILLA";

/** Determina la zona a partir de código postal y/o provincia. CP español: 5 dígitos. */
export function resolveSpainZone(postalCode: string, province?: string): ShippingZone | null {
  const cp = (postalCode || "").replace(/\D/g, "").padStart(5, "0").slice(0, 5);
  if (!/^\d{5}$/.test(cp)) return null;
  const p2 = cp.slice(0, 2);
  if (p2 === "35" || p2 === "38") return "CANARIAS";
  if (p2 === "07") return "BALEARES";
  if (p2 === "51") return "CEUTA";
  if (p2 === "52") return "MELILLA";
  // Península (resto). Provincias 01-50, etc.
  const n = Number(p2);
  if (n >= 1 && n <= 52) return "PENINSULA";
  // Fallback por nombre de provincia si CP no encaja
  const prov = (province || "").toLowerCase();
  if (prov.includes("canarias") || prov.includes("santa cruz de tenerife") || prov.includes("las palmas")) return "CANARIAS";
  if (prov.includes("baleares") || prov.includes("illes balears") || prov.includes("mallorca") || prov.includes("menorca") || prov.includes("ibiza")) return "BALEARES";
  if (prov.includes("ceuta")) return "CEUTA";
  if (prov.includes("melilla")) return "MELILLA";
  return null;
}

export function isSpainDestination(country?: string) {
  const c = (country || "ES").toUpperCase().trim();
  return c === "ES" || c === "ESP" || c === "ESPAÑA" || c === "SPAIN";
}
