import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, readJson } from "@/lib/api";
import { applyDiscount } from "@/lib/discounts";
import { setCartDiscountCode, getCartSummary } from "@/lib/cart";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().trim().max(40) });

export const POST = withApi(
  async (request: Request) => {
    const { code } = schema.parse(await readJson(request));
    const cart = await getCartSummary();

    if (!code) {
      await setCartDiscountCode(null);
      return NextResponse.json({ ok: true, discount: null });
    }

    const productIds = (
      await db.cartItem.findMany({
        where: { cartId: (await ensureCartId()) },
        select: { variant: { select: { productId: true, product: { select: { categoryId: true } } } } },
      })
    ).map((i) => i.variant.productId);

    const categoryIds = (
      await db.product.findMany({ where: { id: { in: productIds } }, select: { categoryId: true } })
    )
      .map((p) => p.categoryId)
      .filter((id): id is string => Boolean(id));

    const result = await applyDiscount(code, cart.subtotalCents, productIds, categoryIds);
    if (!result.valid) return NextResponse.json({ error: result.reason }, { status: 400 });

    await setCartDiscountCode(result.code);
    return NextResponse.json({ ok: true, discount: result });
  },
  { rateLimit: { limit: 20, windowMs: 60 * 1000, key: "cart-discount" } },
);

async function ensureCartId(): Promise<string> {
  const { ensureCart } = await import("@/lib/cart");
  const cart = await ensureCart();
  return cart.id;
}
