import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { resendOrderConfirmation } from "@/lib/orders";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Reenvía el email de confirmación al cliente desde el panel de pedidos.
 * Devuelve el motivo exacto si el envío falla (p. ej. falta RESEND_API_KEY
 * o el dominio del remitente no está verificado en Resend).
 */
export const POST = withApi<Ctx>(
  async (_request, { params }) => {
    const admin = await requireAdmin();
    const { id } = await params;

    const result = await resendOrderConfirmation(id);
    await audit({
      adminUserId: admin.id,
      action: "order.email.resend",
      entity: "Order",
      entityId: id,
      after: { sent: result.ok },
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, to: result.to });
  },
  { rateLimit: { limit: 10, windowMs: 60 * 1000, key: "admin-order-email" } },
);
