import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { generateOrderNumber } from "@/lib/slug";
import { applyDiscount } from "@/lib/discounts";
import { quoteShipping } from "@/lib/shipping";
import { consumeStock, StockError, validateStockForItems } from "@/lib/stock";

export type CheckoutInput = {
  email: string;
  phone?: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  shippingMethod?: string;
  discountCode?: string;
  userId?: string | null;
  customerNote?: string;
};

export type OrderTotals = {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  discountCode: string | null;
  methodId: string;
};

/**
 * Recalcula TODOS los importes en servidor a partir de la BD.
 * Es la única fuente de verdad: el navegador no envía precios.
 */
export async function computeTotals(cartId: string, shippingMethod = "standard", discountCode?: string | null): Promise<
  { ok: true; totals: OrderTotals; lines: { variantId: string; qty: number; unitPriceCents: number; totalCents: number; productName: string; productSlug: string; size: string; colorName: string | null; imageUrl: string | null }[] } | { ok: false; error: string }
> {
  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              color: true,
              product: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) return { ok: false, error: "El carrito está vacío" };

  const lines = cart.items
    .filter((item) => item.variant.product.status === "ACTIVE")
    .map((item) => {
      const unit = item.variant.priceCents ?? item.variant.product.priceCents;
      return {
        variantId: item.variantId,
        qty: item.qty,
        unitPriceCents: unit,
        totalCents: unit * item.qty,
        productName: item.variant.product.name,
        productSlug: item.variant.product.slug,
        size: item.variant.size,
        colorName: item.variant.color?.name ?? null,
        imageUrl: item.variant.product.images[0]?.url ?? null,
      };
    });

  if (lines.length === 0) return { ok: false, error: "El carrito está vacío" };

  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const shipping = await quoteShipping(subtotalCents, shippingMethod);

  let discountCents = 0;
  let appliedCode: string | null = null;
  const code = discountCode ?? cart.discountCode;
  if (code) {
    const productIds = cart.items.map((i) => i.variant.productId);
    const categoryIds = (
      await db.product.findMany({
        where: { id: { in: cart.items.map((i) => i.variant.productId) } },
        select: { categoryId: true },
      })
    )
      .map((p) => p.categoryId)
      .filter((id): id is string => Boolean(id));

    const result = await applyDiscount(code, subtotalCents, productIds, categoryIds);
    if (result.valid) {
      discountCents = result.discountCents;
      appliedCode = result.code;
    }
  }

  const shippingCents = shipping?.priceCents ?? 0;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  return {
    ok: true,
    totals: {
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      discountCode: appliedCode,
      methodId: shipping?.methodId ?? "standard",
    },
    lines,
  };
}

/**
 * Crea el pedido en estado PENDING, descuenta stock y devuelve el pedido.
 * El pago se confirma después vía webhook de Stripe (o admin en manual).
 * Se ejecuta en transacción para que nunca se cobre sin pedido ni se vendan
 * unidades sin stock.
 */
export async function createOrderFromCart(params: {
  cartId: string;
  input: CheckoutInput;
  shippingMethod?: string;
  discountCode?: string | null;
}): Promise<{ orderId: string; orderNumber: string; totals: OrderTotals } | { error: string }> {
  const computed = await computeTotals(params.cartId, params.shippingMethod ?? "standard", params.discountCode);
  if (!computed.ok) return { error: computed.error };

  const stockProblem = await validateStockForItems(computed.lines);
  if (stockProblem) return { error: stockProblem };

  const { totals, lines } = computed;

  try {
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: params.input.userId ?? null,
          email: params.input.email.trim().toLowerCase(),
          phone: params.input.phone?.trim() || null,
          status: "PENDING",
          shipName: params.input.name,
          shipLine1: params.input.line1,
          shipLine2: params.input.line2 || null,
          shipCity: params.input.city,
          shipProvince: params.input.province,
          shipPostalCode: params.input.postalCode,
          shipCountry: params.input.country ?? "ES",
          subtotalCents: totals.subtotalCents,
          shippingCents: totals.shippingCents,
          discountCents: totals.discountCents,
          totalCents: totals.totalCents,
          discountCode: totals.discountCode,
          shippingMethod: totals.methodId,
          customerNote: params.input.customerNote || null,
          items: {
            create: lines.map((line) => ({
              variantId: line.variantId,
              productName: line.productName,
              productSlug: line.productSlug,
              size: line.size,
              colorName: line.colorName,
              imageUrl: line.imageUrl,
              unitPriceCents: line.unitPriceCents,
              qty: line.qty,
              totalCents: line.totalCents,
            })),
          },
        },
      });

      await consumeStock(
        tx,
        lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        `Pedido ${created.orderNumber}`,
      );

      if (totals.discountCode) {
        const discount = await tx.discount.findUnique({ where: { code: totals.discountCode } });
        if (discount) {
          await tx.discount.update({ where: { id: discount.id }, data: { usedCount: { increment: 1 } } });
          await tx.discountUsage.create({
            data: {
              discountId: discount.id,
              orderId: created.id,
              userId: params.input.userId ?? null,
              email: params.input.email,
              amountCents: totals.discountCents,
            },
          });
        }
      }

      await tx.payment.create({
        data: {
          orderId: created.id,
          provider: "stripe",
          status: "REQUIRES_PAYMENT",
          amountCents: totals.totalCents,
        },
      });

      return created;
    });

    // Vaciar el carrito solo después de crear el pedido con éxito.
    await db.cartItem.deleteMany({ where: { cartId: params.cartId } });
    await db.cart.update({ where: { id: params.cartId }, data: { discountCode: null } }).catch(() => undefined);

    return { orderId: order.id, orderNumber: order.orderNumber, totals };
  } catch (error) {
    if (error instanceof StockError) return { error: error.message };
    throw error;
  }
}

/** Restaura stock y marca el pedido como cancelado (solo pedidos sin pago). */
export async function cancelOrder(orderId: string, adminUserId?: string, reason = "Cancelado"): Promise<void> {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status === "PAID" || order.status === "SHIPPED" || order.status === "DELIVERED") {
      throw new Error("Usa un reembolso para pedidos ya pagados");
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.payment.updateMany({ where: { orderId, status: "REQUIRES_PAYMENT" }, data: { status: "CANCELLED" } });
    await restore(tx, order.items.map((i) => ({ variantId: i.variantId, qty: i.qty, productName: i.productName })), `${reason} · pedido ${order.orderNumber}`, adminUserId);
  });
}

async function restore(
  tx: Prisma.TransactionClient,
  items: { variantId: string | null; qty: number; productName: string }[],
  reason: string,
  adminUserId?: string,
): Promise<void> {
  for (const item of items) {
    if (!item.variantId) continue;
    const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stock: true } });
    if (!variant) continue;
    const updated = await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
    await tx.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        before: variant.stock,
        after: updated.stock,
        change: item.qty,
        reason,
        adminUserId: adminUserId ?? null,
      },
    });
  }
}
