import "server-only";
import { db } from "@/lib/db";

export type DiscountResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      code: string;
      discountCents: number;
      description: string;
    };

/**
 * Valida un código descuento contra el subtotal y el contenido del pedido.
 * El cálculo SIEMPRE ocurre aquí, en servidor: el frontend nunca decide el importe.
 */
export async function applyDiscount(code: string, subtotalCents: number, productIds: string[] = [], categoryIds: string[] = []): Promise<DiscountResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { valid: false, reason: "Código vacío" };

  const discount = await db.discount.findUnique({ where: { code: normalized } });
  if (!discount || !discount.active) return { valid: false, reason: "Código no válido" };

  const now = new Date();
  if (discount.startsAt && discount.startsAt > now) return { valid: false, reason: "El código aún no está activo" };
  if (discount.endsAt && discount.endsAt < now) return { valid: false, reason: "El código ha caducado" };
  if (discount.maxUses != null && discount.usedCount >= discount.maxUses) return { valid: false, reason: "Código agotado" };
  if (subtotalCents < discount.minOrderCents) {
    return { valid: false, reason: `Compra mínima de ${(discount.minOrderCents / 100).toFixed(2)} €` };
  }

  // Si el descuento no es global, debe aplicar al menos a un producto del carrito.
  if (!discount.appliesToAll) {
    const applies =
      productIds.some((id) => discount.productIds.includes(id)) ||
      categoryIds.some((id) => discount.categoryIds.includes(id));
    if (!applies) return { valid: false, reason: "El código no aplica a estos productos" };
  }

  const discountCents =
    discount.type === "PERCENTAGE" ? Math.round((subtotalCents * Math.min(discount.value, 100)) / 100) : Math.min(discount.value, subtotalCents);

  if (discountCents <= 0) return { valid: false, reason: "El código no aplica" };

  return {
    valid: true,
    code: discount.code,
    discountCents,
    description: discount.type === "PERCENTAGE" ? `-${discount.value}%` : `-${(discount.value / 100).toFixed(2)} €`,
  };
}
