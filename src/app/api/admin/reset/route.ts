import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Código único que protege el borrado total desde /admin/settings. */
const RESET_CODE = "201983";

/**
 * Borra todos los datos de la tienda (pedidos, productos, clientes, etc.)
 * conservando:
 *  · las cuentas de administrador y sus sesiones,
 *  · los ajustes de la tienda (envíos, email, datos fiscales).
 * Requiere el código 201983.
 */
export const POST = withApi(async (request: Request) => {
  const admin = await requireAdmin();
  const body = (await readJson(request).catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (code !== RESET_CODE) {
    return NextResponse.json({ error: "Código incorrecto. No se ha borrado nada." }, { status: 403 });
  }

  const deleted = await db.$transaction(async (tx) => {
    const counts = {
      orders: await tx.order.count(),
      products: await tx.product.count(),
      customers: await tx.user.count({ where: { role: "CUSTOMER" } }),
    };

    // Orden respetando las claves foráneas (de hijos a padres).
    await tx.returnItem.deleteMany();
    await tx.returnRequest.deleteMany();
    await tx.refund.deleteMany();
    await tx.payment.deleteMany();
    await tx.orderItem.deleteMany();
    await tx.discountUsage.deleteMany();
    await tx.order.deleteMany();
    await tx.cartItem.deleteMany();
    await tx.cart.deleteMany();
    await tx.checkoutDraft.deleteMany();
    await tx.inventoryMovement.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.productImage.deleteMany();
    await tx.productTag.deleteMany();
    await tx.product.deleteMany();
    await tx.color.deleteMany();
    await tx.category.deleteMany();
    await tx.address.deleteMany();
    await tx.passwordReset.deleteMany();
    await tx.loginAttempt.deleteMany();
    await tx.presence.deleteMany();
    await tx.contactMessage.deleteMany();
    await tx.newsletterSubscriber.deleteMany();
    await tx.discount.deleteMany();
    await tx.shippingRate.deleteMany();
    await tx.auditLog.deleteMany();

    // Las sesiones de clientes se van en cascada con sus usuarios.
    await tx.session.deleteMany({ where: { user: { role: "CUSTOMER" } } });
    await tx.user.deleteMany({ where: { role: "CUSTOMER" } });

    // Dejamos constancia de quién hizo el reset (y cuándo).
    await tx.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: "RESET_ALL",
        entity: "Store",
        after: { at: new Date().toISOString(), ...counts },
      },
    });

    return counts;
  });

  return NextResponse.json({ ok: true, deleted });
}, { rateLimit: { limit: 5, windowMs: 60 * 60 * 1000, key: "admin-reset" } });
