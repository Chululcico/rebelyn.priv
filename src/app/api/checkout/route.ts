import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { checkoutSchema } from "@/lib/validate";
import { ensureCart } from "@/lib/cart";
import { computeTotals, plainJson } from "@/lib/orders";
import { validateStockForItems } from "@/lib/stock";
import { getCurrentUser } from "@/lib/auth";
import { sumupConfigured } from "@/lib/env";
import { resolveBaseUrl } from "@/lib/public-url";
import { listShippingMethods } from "@/lib/shipping";
import { db } from "@/lib/db";
import { createSumupCheckout } from "@/lib/payments/sumup-provider";
import { publicPaymentMethods } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * PAGO PRIMERO → PEDIDO DESPUÉS.
 * Este endpoint NO registra ningún pedido. Solo:
 *  1. Valida los datos y recalcula totales en servidor (precios reales).
 *  2. Comprueba stock.
 *  3. Guarda un CheckoutDraft (snapshot de carrito, dirección y totales).
 *  4. Crea el pago hospedado en SumUp y devuelve su URL + métodos disponibles.
 *
 * El pedido se crea al confirmarse el pago (webhook o /api/orders/verify).
 */
export const POST = withApi(
  async (request: Request) => {
    const input = checkoutSchema.parse(await readJson(request));
    const user = await getCurrentUser();
    const cart = await ensureCart();

    // El método de envío debe ser uno de los activos (precio fijo configurado).
    const activeMethods = await listShippingMethods();
    const methodId = input.shippingMethod || "standard";
    if (!activeMethods.some((m) => m.id === methodId)) {
      return NextResponse.json({ error: "Método de envío no válido." }, { status: 400 });
    }

    // 1. Totales SIEMPRE en servidor (carrito real de la BD + envío de ajustes).
    const computed = await computeTotals(cart.id, methodId, input.discountCode || null);
    if (!computed.ok) return NextResponse.json({ error: computed.error }, { status: 400 });
    const { totals, lines } = computed;

    // 2. Stock disponible ahora (se revalida otra vez al confirmar el pago).
    const stockProblem = await validateStockForItems(lines);
    if (stockProblem) return NextResponse.json({ error: stockProblem }, { status: 409 });

    // 3. Debe existir al menos un método de pago configurado.
    const methods = publicPaymentMethods();
    if (methods.length === 0 || !sumupConfigured()) {
      return NextResponse.json(
        { error: "No hay métodos de pago disponibles en este momento. Escríbenos a hola@rebelyn.net y te ayudaremos a completar el pedido." },
        { status: 503 },
      );
    }

    // 4. Borrador con el snapshot exacto de lo que el cliente va a pagar.
    const draft = await db.checkoutDraft.create({
      data: {
        cartId: cart.id,
        userId: user?.id ?? null,
        email: input.email.trim().toLowerCase(),
        input: plainJson({
          email: input.email,
          phone: input.phone,
          name: input.name,
          line1: input.line1,
          line2: input.line2 || "",
          city: input.city,
          province: input.province,
          postalCode: input.postalCode,
          country: input.country,
          shippingMethod: input.shippingMethod,
          shippingServiceId: input.shippingServiceId || "",
          shippingServiceCode: input.shippingServiceCode || "",
          customerNote: input.customerNote || "",
          userId: user?.id ?? null,
        }),
        lines: plainJson(lines),
        totals: plainJson(totals),
        shippingSelection: plainJson({
          methodId: totals.methodId,
          shippingMethod: methodId,
          postalCode: input.postalCode,
          province: input.province,
          country: input.country,
        }),
        discountCode: totals.discountCode,
        provider: "sumup",
        amountCents: totals.totalCents,
        currency: "EUR",
        status: "PENDING",
      },
    });

    // 5. Crear el pago hospedado de SumUp (sin pedido todavía).
    //    - redirect_url: a donde vuelve el navegador del cliente tras pagar.
    //    - return_url:  webhook servidor a servidor con los cambios de estado.
    const baseUrl = resolveBaseUrl(request);
    try {
      const checkout = await createSumupCheckout({
        reference: draft.id,
        amountCents: totals.totalCents,
        currency: "EUR",
        description: `REBELYN - compra de ${input.email}`,
        returnUrl: `${baseUrl}/success?draft=${encodeURIComponent(draft.id)}`,
        callbackUrl: `${baseUrl}/api/webhooks/sumup`,
      });

      await db.checkoutDraft.update({
        where: { id: draft.id },
        data: { providerCheckoutId: checkout.id },
      });

      return NextResponse.json({
        ok: true,
        draftId: draft.id,
        checkoutUrl: checkout.checkoutUrl,
        methods,
        totals,
      });
    } catch (e) {
      console.error("[checkout] Error creando checkout de SumUp:", e);
      await db.checkoutDraft
        .update({ where: { id: draft.id }, data: { status: "FAILED", failureReason: "Error creando checkout en SumUp" } })
        .catch(() => undefined);
      const reason = e instanceof Error ? e.message : "error desconocido";
      return NextResponse.json({ error: `No se pudo iniciar el pago con SumUp: ${reason}` }, { status: 502 });
    }
  },
  { rateLimit: { limit: 15, windowMs: 10 * 60 * 1000, key: "checkout" } },
);
