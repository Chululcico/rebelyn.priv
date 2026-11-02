import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const CART_COOKIE = "rb_cart";
const MAX_QTY_PER_LINE = 10;

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  size: string;
  colorName: string | null;
  colorHex: string | null;
  unitPriceCents: number;
  compareAtCents: number | null;
  qty: number;
  totalCents: number;
  maxStock: number;
};

export type CartSummary = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  discountCode: string | null;
};

const lineInclude = {
  variant: {
    include: {
      color: true,
      product: { include: { images: { orderBy: { position: "asc" as const } } } },
    },
  },
} satisfies Prisma.CartItemInclude;

/** Garantiza un carrito para el visitante (cookie) o el usuario logueado. */
export async function ensureCart(): Promise<{ id: string; token: string | null }> {
  const userSession = await getCurrentUserId();

  if (userSession) {
    const existing = await db.cart.findFirst({ where: { userId: userSession }, orderBy: { createdAt: "desc" } });
    if (existing) return { id: existing.id, token: existing.token };
    const created = await db.cart.create({ data: { userId: userSession } });
    return { id: created.id, token: null };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await db.cart.findUnique({ where: { token } });
    if (existing) return { id: existing.id, token };
  }

  const newToken = randomBytes(24).toString("base64url");
  const created = await db.cart.create({ data: { token: newToken } });
  cookieStore.set(CART_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return { id: created.id, token: newToken };
}

async function getCurrentUserId(): Promise<string | null> {
  // Importación diferida para evitar ciclos con auth.ts en el cliente.
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function getCartSummary(): Promise<CartSummary> {
  const cart = await ensureCart();
  const items = await db.cartItem.findMany({ where: { cartId: cart.id }, include: lineInclude, orderBy: { createdAt: "asc" } });
  const fullCart = await db.cart.findUnique({ where: { id: cart.id } });

  const lines: CartLine[] = items
    .filter((item) => item.variant.product.status === "ACTIVE")
    .map((item) => {
      const product = item.variant.product;
      const unit = item.variant.priceCents ?? product.priceCents;
      return {
        id: item.id,
        variantId: item.variantId,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url ?? null,
        size: item.variant.size,
        colorName: item.variant.color?.name ?? null,
        colorHex: item.variant.color?.hex ?? null,
        unitPriceCents: unit,
        compareAtCents: product.compareAtCents,
        qty: item.qty,
        totalCents: unit * item.qty,
        maxStock: item.variant.stock,
      };
    });

  return {
    lines,
    count: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotalCents: lines.reduce((sum, l) => sum + l.totalCents, 0),
    discountCode: fullCart?.discountCode ?? null,
  };
}

export async function addToCart(variantId: string, qty = 1): Promise<{ ok: boolean; message: string }> {
  const quantity = Math.max(1, Math.min(qty, MAX_QTY_PER_LINE));
  const cart = await ensureCart();

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true } } },
  });
  if (!variant || variant.product.status !== "ACTIVE") return { ok: false, message: "Producto no disponible" };
  if (variant.stock <= 0) return { ok: false, message: "Agotado" };

  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const nextQty = Math.min((existing?.qty ?? 0) + quantity, MAX_QTY_PER_LINE, variant.stock);

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { qty: nextQty } });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, variantId, qty: Math.min(quantity, variant.stock) } });
  }

  if (nextQty < quantity + (existing?.qty ?? 0)) {
    return { ok: true, message: `Añadido (máx. ${Math.min(MAX_QTY_PER_LINE, variant.stock)} por línea)` };
  }
  return { ok: true, message: "Añadido al carrito" };
}

export async function updateCartQty(itemId: string, qty: number): Promise<{ ok: boolean; message: string }> {
  const cart = await ensureCart();
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { variant: { select: { stock: true } } },
  });
  if (!item) return { ok: false, message: "Línea no encontrada" };

  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return { ok: true, message: "Eliminado" };
  }

  const safeQty = Math.min(qty, MAX_QTY_PER_LINE, item.variant.stock);
  await db.cartItem.update({ where: { id: item.id }, data: { qty: safeQty } });
  return { ok: true, message: safeQty < qty ? `Máximo ${item.variant.stock} en stock` : "Actualizado" };
}

export async function removeCartItem(itemId: string): Promise<{ ok: boolean }> {
  const cart = await ensureCart();
  await db.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return { ok: true };
}

export async function clearCart(): Promise<void> {
  const cart = await ensureCart();
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
  await db.cart.update({ where: { id: cart.id }, data: { discountCode: null } });
}

export async function setCartDiscountCode(code: string | null): Promise<void> {
  const cart = await ensureCart();
  await db.cart.update({ where: { id: cart.id }, data: { discountCode: code } });
}

export const MAX_QTY_PER_LINE_CONST = MAX_QTY_PER_LINE;
