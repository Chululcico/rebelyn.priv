import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { cartQtySchema } from "@/lib/validate";
import { removeCartItem, updateCartQty } from "@/lib/cart";

export const runtime = "nodejs";

export const PATCH = withApi(async (request: Request) => {
  const input = cartQtySchema.parse(await readJson(request));
  const result = await updateCartQty(input.itemId, input.qty);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 404 });
  return NextResponse.json(result);
});

export const DELETE = withApi(async (request: Request) => {
  const body = await readJson<{ itemId?: string }>(request).catch(() => ({ itemId: "" }));
  const parsed = cartQtySchema.pick({ itemId: true }).parse({ itemId: body.itemId ?? "" });
  await removeCartItem(parsed.itemId);
  return NextResponse.json({ ok: true });
});
