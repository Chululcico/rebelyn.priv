import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Mis pedidos" };
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

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/orders");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h2 className="text-[1.8rem] uppercase tracking-[0.14em] mb-6">Mis pedidos</h2>
      {orders.length === 0 ? (
        <p className="text-[1.4rem] text-muted">
          Aún no tienes pedidos. <Link href="/shop" className="underline">Ver catálogo</Link>
        </p>
      ) : (
        <ul className="border-t hairline">
          {orders.map((order) => (
            <li key={order.id} className="py-5 border-b hairline">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <Link href={`/account/orders/${order.id}`} className="text-[1.5rem] underline">{order.orderNumber}</Link>
                  <p className="text-[1.25rem] text-muted">
                    {new Date(order.createdAt).toLocaleDateString("es-ES")} · {STATUS_LABEL[order.status] ?? order.status}
                  </p>
                </div>
                <p className="text-[1.5rem]">{formatMoney(order.totalCents)}</p>
              </div>
              <ul className="flex flex-wrap gap-3 mt-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-[1.25rem] text-muted">
                    {item.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.imageUrl} alt="" width={36} height={48} className="w-9 h-12 object-cover bg-wash" />
                    )}
                    {item.qty}× {item.productName} ({item.size})
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
