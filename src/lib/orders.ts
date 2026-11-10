import "server-only";
import { db } from "@/lib/db";
import type { Order, Prisma } from "@prisma/client";
import { generateOrderNumber } from "@/lib/slug";
import { applyDiscount } from "@/lib/discounts";
import { quoteShipping } from "@/lib/shipping";
import { consumeStock, StockError, validateStockForItems } from "@/lib/stock";
import { sendEmail } from "@/lib/emails";
import { orderPaidEmail } from "@/lib/emails/templates";
import { getSettings } from "@/lib/settings";

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
  shippingServiceId?: string;
  shippingServiceCode?: string;
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
 * El envío usa el PRECIO FIJO configurado en /admin/shipping
 * (métodos Estándar/Express guardados en ajustes de la tienda).
 */
export async function computeTotals(
  cartId: string,
  shippingMethod = "standard",
  discountCode?: string | null,
): Promise<
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

  // Envío: PRECIO FIJO del método elegido, leído de la configuración
  // (/admin/shipping) en servidor. Nunca se acepta un precio del navegador.
  const shipping = await quoteShipping(subtotalCents, shippingMethod);
  if (!shipping) {
    return { ok: false, error: "No hay métodos de envío activos. Configura los precios en el panel de administración." };
  }
  const shippingCents = shipping.priceCents;
  const methodId = shipping.methodId;

  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  return {
    ok: true,
    totals: {
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      discountCode: appliedCode,
      methodId,
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
  const computed = await computeTotals(
    params.cartId,
    params.shippingMethod ?? params.input.shippingMethod ?? "standard",
    params.discountCode ?? null,
  );
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

    // Email automático de confirmación (no bloquea el checkout si falla)
    await sendOrderConfirmation(order.id);

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

/** Convierte un valor a JSON plano (sin undefined) para guardarlo en campos Json de Prisma. */
export function plainJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Prepara y envía el email de confirmación de un pedido (asunto y mensaje
 * editables en /admin/settings; el desglose y la dirección van siempre).
 * Devuelve el resultado para poder mostrar el motivo si falla.
 */
async function sendOrderEmail(
  order: Order & { items?: { productName: string; size: string; qty: number; totalCents: number }[] },
): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  try {
    const { orderEmail } = await getSettings();
    const subject = orderEmail.subject.split("{orderNumber}").join(order.orderNumber);
    const sent = await sendEmail({
      to: order.email,
      subject,
      react: orderPaidEmail(order, { message: orderEmail.message }),
    });
    if (!sent.ok) return { ok: false, error: sent.error ?? "No se pudo enviar el email." };
    return { ok: true, to: order.email };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de envío" };
  }
}

/** Envío automático tras registrar el pedido: solo deja constancia en el log si falla. */
async function sendOrderConfirmation(orderId: string): Promise<void> {
  const fullOrder = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!fullOrder) return;
  const result = await sendOrderEmail(fullOrder);
  if (!result.ok) console.error(`[orders] Email de confirmación no enviado (${fullOrder.orderNumber}):`, result.error);
}

/**
 * Reenvía manualmente el email de confirmación desde el panel de
 * administración. Devuelve el resultado para mostrarlo al admin.
 */
export async function resendOrderConfirmation(
  orderId: string,
): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (!["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return { ok: false, error: "El email de confirmación solo se envía en pedidos pagados." };
  }
  return sendOrderEmail(order);
}

/**
 * PAGO PRIMERO → PEDIDO DESPUÉS.
 * Crea el pedido a partir de un CheckoutDraft cuya CARTA ya ha sido verificada
 * en servidor contra SumUp (webhook o /api/orders/verify).
 *
 * Es idempotente: si dos procesos llegan a la vez (webhook + retorno del
 * navegador), solo uno crea el pedido; el otro recibe el pedido existente.
 */
export async function finalizeDraftOrder(
  draftId: string,
): Promise<{ orderId: string; orderNumber: string } | { error: string }> {
  // Reclamar el borrador: PENDING → PROCESSING. Solo un proceso lo consigue.
  // (Si un intento anterior quedó colgado en PROCESSING > 2 min, se puede reclamar.)
  const claim = await db.checkoutDraft.updateMany({
    where: {
      id: draftId,
      OR: [
        { status: "PENDING" },
        { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 2 * 60 * 1000) } },
      ],
    },
    data: { status: "PROCESSING" },
  });

  const draft = await db.checkoutDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { error: "No encontramos tu pago. Contáctanos indicando el email de compra." };

  if (claim.count === 0) {
    // Otro proceso ya lo está finalizando (o ya finalizó).
    if (draft.status === "PAID" && draft.orderId) {
      const existing = await db.order.findUnique({ where: { id: draft.orderId }, select: { orderNumber: true } });
      if (existing) return { orderId: draft.orderId, orderNumber: existing.orderNumber };
    }
    if (draft.status === "FAILED") {
      return { error: draft.failureReason ?? "El pago no se completó." };
    }
    return { error: "Tu pago se está confirmando en este momento. Espera unos segundos y vuelve a intentarlo." };
  }

  const input = draft.input as unknown as CheckoutInput;
  const lines = draft.lines as unknown as {
    variantId: string;
    qty: number;
    unitPriceCents: number;
    totalCents: number;
    productName: string;
    productSlug: string;
    size: string;
    colorName: string | null;
    imageUrl: string | null;
  }[];
  const totals = draft.totals as unknown as OrderTotals;

  try {
    // Revalidar stock justo antes de registrar (el pago pudo tardar unos minutos).
    const stockProblem = await validateStockForItems(lines);
    if (stockProblem) {
      await db.checkoutDraft
        .update({ where: { id: draft.id }, data: { status: "FAILED", failureReason: stockProblem } })
        .catch(() => undefined);
      return { error: `${stockProblem} Hemos recibido tu pago: contáctanos en hola@rebelyn.net y lo resolveremos de inmediato.` };
    }

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: draft.userId,
          email: draft.email,
          phone: input.phone?.trim() || null,
          status: "PAID",
          paidAt: draft.paidAt ?? new Date(),
          shipName: input.name,
          shipLine1: input.line1,
          shipLine2: input.line2 || null,
          shipCity: input.city,
          shipProvince: input.province,
          shipPostalCode: input.postalCode,
          shipCountry: input.country ?? "ES",
          subtotalCents: totals.subtotalCents,
          shippingCents: totals.shippingCents,
          discountCents: totals.discountCents,
          totalCents: totals.totalCents,
          discountCode: totals.discountCode,
          shippingMethod: totals.methodId,
          customerNote: input.customerNote || null,
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
              userId: draft.userId,
              email: draft.email,
              amountCents: totals.discountCents,
            },
          });
        }
      }

      await tx.payment.create({
        data: {
          orderId: created.id,
          provider: draft.provider,
          status: "SUCCEEDED",
          amountCents: draft.amountCents,
          currency: draft.currency,
          paymentIntentId: draft.providerCheckoutId,
          method: "card",
        },
      });

      await tx.checkoutDraft.update({
        where: { id: draft.id },
        data: { status: "PAID", orderId: created.id, paidAt: new Date() },
      });

      return created;
    });

    // Vaciar del carrito los artículos comprados (best-effort, tras commit).
    await db.cartItem
      .deleteMany({ where: { cartId: draft.cartId, variantId: { in: lines.map((l) => l.variantId) } } })
      .catch(() => undefined);
    await db.cart.update({ where: { id: draft.cartId }, data: { discountCode: null } }).catch(() => undefined);

    // Email de confirmación (no bloquea el registro del pedido si falla).
    await sendOrderConfirmation(order.id);

    return { orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    if (error instanceof StockError) {
      await db.checkoutDraft
        .update({ where: { id: draft.id }, data: { status: "FAILED", failureReason: error.message } })
        .catch(() => undefined);
      return { error: `${error.message} Hemos recibido tu pago: contáctanos en hola@rebelyn.net y lo resolveremos de inmediato.` };
    }
    // Error transitorio: devolver el borrador a PENDING para poder reintentar.
    await db.checkoutDraft.update({ where: { id: draft.id }, data: { status: "PENDING" } }).catch(() => undefined);
    console.error("[orders] Error finalizando borrador de checkout:", error);
    return { error: "No se pudo registrar el pedido. Inténtalo de nuevo en unos segundos." };
  }
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
