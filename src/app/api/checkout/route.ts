import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { checkoutSchema } from "@/lib/validate";
import { ensureCart } from "@/lib/cart";
import { createOrderFromCart } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { getCurrentUser } from "@/lib/auth";
import { sumupConfigured } from "@/lib/env";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const input = checkoutSchema.parse(await readJson(request));
    const user = await getCurrentUser();
    const cart = await ensureCart();

    const result = await createOrderFromCart({
      cartId: cart.id,
      shippingMethod: input.shippingMethod,
      shippingServiceId: input.shippingServiceId || undefined,
      shippingServiceCode: input.shippingServiceCode || undefined,
      discountCode: input.discountCode || null,
      input: {
        email: input.email,
        phone: input.phone,
        name: input.name,
        line1: input.line1,
        line2: input.line2,
        city: input.city,
        province: input.province,
        postalCode: input.postalCode,
        country: input.country,
        shippingServiceId: input.shippingServiceId || undefined,
        shippingServiceCode: input.shippingServiceCode || undefined,
        userId: user?.id ?? null,
        customerNote: input.customerNote,
      },
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const provider = getPaymentProvider("sumup");
    if (!provider) {
      return NextResponse.json(
        {
          error: "El pago con SumUp no está configurado. Tu pedido queda registrado y te contactaremos para el pago.",
          orderNumber: result.orderNumber,
          orderId: result.orderId,
          paymentConfigured: false,
        },
        { status: 503 },
      );
    }

    const payment = await provider.createPayment({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      amountCents: result.totals.totalCents,
      currency: "EUR",
      email: input.email,
    });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      totals: result.totals,
      checkoutUrl: payment.clientSecret,
      provider: "sumup",
      paymentConfigured: sumupConfigured(),
    });
  },
  { rateLimit: { limit: 15, windowMs: 10 * 60 * 1000, key: "checkout" } },
);
