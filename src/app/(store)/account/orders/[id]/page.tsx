import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Detalle de pedido" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
  PROCESSING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/orders`);
  const { id } = await params;

  const order = await db.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div>
      <Link href="/account/orders" className="text-[1.3rem] underline text-muted">← Volver a pedidos</Link>
      <div className="flex flex-wrap justify-between items-baseline gap-3 mt-3 mb-8">
        <h2 className="text-[1.8rem] uppercase tracking-[0.14em]">{order.orderNumber}</h2>
        <p className="text-[1.35rem] text-muted">{STATUS_LABEL[order.status] ?? order.status}</p>
      </div>

      <ul className="border-t hairline mb-8">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4 border-b hairline">
            {item.imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={item.imageUrl} alt="" width={64} height={84} className="w-16 h-[8.4rem] object-cover bg-wash" />
            )}
            <div className="flex-1">
              <p className="text-[1.4rem]">{item.productName}</p>
              <p className="text-[1.25rem] text-muted">
                {item.colorName ? `${item.colorName} · ` : ""}Talla {item.size} · {item.qty} ud.
              </p>
            </div>
            <p className="text-[1.4rem]">{formatMoney(item.totalCents)}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="border hairline p-5">
          <h3 className="text-[1.35rem] uppercase tracking-[0.12em] mb-3">Totales</h3>
          <dl className="flex flex-col gap-1 text-[1.3rem]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt>Envío</dt><dd>{order.shippingCents === 0 ? "Gratis" : formatMoney(order.shippingCents)}</dd></div>
            {order.discountCents > 0 && (
              <div className="flex justify-between"><dt>Descuento</dt><dd>−{formatMoney(order.discountCents)}</dd></div>
            )}
            <div className="flex justify-between border-t hairline mt-2 pt-2 text-[1.5rem]"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
          </dl>
          {order.trackingNumber && (
            <p className="text-[1.3rem] mt-4">Seguimiento: <strong>{order.trackingNumber}</strong></p>
          )}
        </div>
        <div className="border hairline p-5">
          <h3 className="text-[1.35rem] uppercase tracking-[0.12em] mb-3">Envío</h3>
          <p className="text-[1.3rem]">
            {order.shipName}
            <br />
            {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}
            <br />
            {order.shipPostalCode} {order.shipCity} ({order.shipProvince}), {order.shipCountry}
          </p>
        </div>
      </div>

      <p className="text-[1.3rem] text-muted mt-6">
        ¿Problemas con el pedido? <Link href="/contact" className="underline">Escríbenos</Link> o solicita una{" "}
        <Link href="/returns" className="underline">devolución</Link>.
      </p>
    </div>
  );
}
