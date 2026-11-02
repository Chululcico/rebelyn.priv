import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Descuenta stock de forma atómica dentro de una transacción y registra el
 * movimiento de inventario. Si no hay stock suficiente, lanza.
 * Es el ÚNICO punto del sistema que puede reducir stock por una venta.
 */
export async function consumeStock(
  tx: Prisma.TransactionClient,
  items: { variantId: string; qty: number }[],
  reason: string,
  adminUserId?: string,
): Promise<void> {
  for (const item of items) {
    // Decremento condicional: evita carreras entre dos checkouts simultáneos.
    const result = await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "stock" = "stock" - ${item.qty}, "updatedAt" = NOW()
      WHERE "id" = ${item.variantId} AND "stock" >= ${item.qty}`;

    if (result === 0) {
      throw new StockError(`Sin stock suficiente para la variante ${item.variantId}`);
    }

    const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
    await tx.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        before: variant.stock + item.qty,
        after: variant.stock,
        change: -item.qty,
        reason,
        adminUserId: adminUserId ?? null,
      },
    });
  }
}

/** Devuelve stock (devoluciones, cancelaciones) y lo registra. */
export async function restoreStock(
  tx: Prisma.TransactionClient,
  items: { variantId: string | null; qty: number }[],
  reason: string,
  adminUserId?: string,
): Promise<void> {
  for (const item of items) {
    if (!item.variantId) continue;
    const before = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stock: true } });
    if (!before) continue;
    const variant = await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
    await tx.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        before: before.stock,
        after: variant.stock,
        change: item.qty,
        reason,
        adminUserId: adminUserId ?? null,
      },
    });
  }
}

/** Ajuste manual de stock desde el panel admin. */
export async function adjustStock(params: {
  variantId: string;
  delta: number;
  reason: string;
  adminUserId: string;
  absolute?: number;
}): Promise<number> {
  return db.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: params.variantId } });
    const after = params.absolute != null ? params.absolute : variant.stock + params.delta;
    if (after < 0) throw new StockError("El stock no puede quedar negativo");
    const updated = await tx.productVariant.update({ where: { id: params.variantId }, data: { stock: after } });
    await tx.inventoryMovement.create({
      data: {
        variantId: params.variantId,
        before: variant.stock,
        after: updated.stock,
        change: updated.stock - variant.stock,
        reason: params.reason,
        adminUserId: params.adminUserId,
      },
    });
    return updated.stock;
  });
}

export class StockError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
  }
}

/** Valida que todas las líneas tienen stock; devuelve el error concreto si no. */
export async function validateStockForItems(items: { variantId: string; qty: number }[]): Promise<string | null> {
  for (const item of items) {
    const variant = await db.productVariant.findUnique({
      where: { id: item.variantId },
      include: { product: { select: { name: true } } },
    });
    if (!variant) return "Una de las prendas ya no está disponible";
    if (variant.stock < item.qty) {
      return variant.stock === 0
        ? `${variant.product.name} (${variant.size}) está agotado`
        : `Solo quedan ${variant.stock} unidades de ${variant.product.name} (${variant.size})`;
    }
  }
  return null;
}
