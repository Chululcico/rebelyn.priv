import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { addToCartSchema } from "@/lib/validate";
import { addToCart, getCartSummary } from "@/lib/cart";
import { quoteShipping } from "@/lib/shipping";
import { applyDiscount } from "@/lib/discounts";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withApi(
  async () => {
    const cart = await getCartSummary();
    const shipping = await quoteShipping(cart.subtotalCents);
    let discount = null;
    if (cart.discountCode) {
      const result = await applyDiscount(cart.discountCode, cart.subtotalCents);
      discount = result.valid ? result : { valid: false as const, reason: result.reason };
    }
    return NextResponse.json({
      ...cart,
      shipping,
      discount,
      totalCents: Math.max(0, cart.subtotalCents - (discount?.valid ? discount.discountCents : 0)) + (shipping?.priceCents ?? 0),
    });
  },
  { csrf: false },
);

export const POST = withApi(
  async (request: Request) => {
    const input = addToCartSchema.parse(await readJson(request));
    const result = await addToCart(input.variantId, input.qty);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 409 });
    const cart = await getCartSummary();
    return NextResponse.json({ ok: true, message: result.message, count: cart.count });
  },
  { rateLimit: { limit: 60, windowMs: 60 * 1000, key: "cart-add" } },
);
