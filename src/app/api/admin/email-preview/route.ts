import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import type { Order } from "@prisma/client";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { orderPaidEmail } from "@/lib/emails/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vista previa REAL del email de pedido confirmado.
 *
 * Usa exactamente la misma plantilla que el envío al cliente, con un pedido
 * de ejemplo y el asunto/mensaje que el admin está escribiendo en ese momento.
 * El HTML se muestra dentro de un iframe en /admin/settings#email-pedido.
 */
export const POST = withApi(
  async (request: Request) => {
    await requireAdmin();

    const body = await readJson<{ subject?: string; message?: string }>(request);
    const subject = (body.subject ?? "").trim() || "Pedido confirmado {orderNumber} · REBELYN";
    const message = (body.message ?? "").trim();

    const sampleOrderNumber = "RB-20261112-ABCD";
    const sampleName = "María";

    const now = new Date();
    const sampleOrder: Order & {
      items: { productName: string; size: string; qty: number; totalCents: number }[];
    } = {
      id: "preview",
      orderNumber: sampleOrderNumber,
      userId: null,
      email: "cliente@ejemplo.com",
      phone: "600 000 000",
      status: "PAID",
      shipName: `${sampleName} García`,
      shipLine1: "Calle Mayor 12",
      shipLine2: "2º B",
      shipCity: "Madrid",
      shipProvince: "Madrid",
      shipPostalCode: "28013",
      shipCountry: "España",
      subtotalCents: 5980,
      shippingCents: 490,
      discountCents: 0,
      totalCents: 6470,
      currency: "EUR",
      discountCode: null,
      shippingMethod: "standard",
      trackingNumber: null,
      customerNote: null,
      stripePaymentIntentId: null,
      createdAt: now,
      paidAt: now,
      shippedAt: null,
      updatedAt: now,
      items: [
        { productName: "Camiseta REBELYN", size: "M", qty: 2, totalCents: 5980 },
      ],
    };

    const renderedSubject = subject
      .split("{orderNumber}")
      .join(sampleOrderNumber)
      .split("{nombre}")
      .join(sampleName);

    const html = await render(orderPaidEmail(sampleOrder, { message }));

    return NextResponse.json({ subject: renderedSubject, html });
  },
  { rateLimit: { limit: 600, windowMs: 60 * 1000, key: "admin-email-preview" } },
);
