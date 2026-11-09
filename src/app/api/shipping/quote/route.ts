import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { z } from "zod";
import { ensureCart } from "@/lib/cart";
import { quoteShippingServices } from "@/lib/shipping/engine";

export const runtime = "nodejs";

const schema = z.object({
  postalCode: z.string().trim().regex(/^\d{5}$/, "Código postal de 5 dígitos"),
  province: z.string().trim().max(60).optional().or(z.literal("")),
  country: z.string().trim().max(2).default("ES"),
});

// Cotiza servicios de envío para el carrito actual y destino indicado.
// Solo devuelve información; el precio final se vuelve a validar al crear el pedido.
export const POST = withApi(
  async (request: Request) => {
    const input = schema.parse(await readJson(request));
    const cart = await ensureCart();
    const quote = await quoteShippingServices({
      cartId: cart.id,
      destination: { postalCode: input.postalCode, province: input.province || undefined, country: input.country || "ES" },
    });
    return NextResponse.json(quote);
  },
  { rateLimit: { limit: 40, windowMs: 60 * 1000, key: "shipping-quote" } },
);
