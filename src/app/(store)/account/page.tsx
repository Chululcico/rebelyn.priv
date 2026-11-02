import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const [orders, addressCount] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: { take: 2 } },
    }),
    db.address.count({ where: { userId: user.id } }),
  ]);

  return (
    <div>
      <h2 className="text-[1.8rem] uppercase tracking-[0.14em] mb-6">Hola{user.name ? `, ${user.name}` : ""}</h2>

      <div className="grid gap-6 sm:grid-cols-3 mb-10">
        <div className="border hairline p-5">
          <p className="text-[1.3rem] text-muted uppercase tracking-[0.1em]">Pedidos</p>
          <p className="text-[2.4rem] mt-1">{orders.length}</p>
          <Link href="/account/orders" className="text-[1.25rem] underline">Ver todos</Link>
        </div>
        <div className="border hairline p-5">
          <p className="text-[1.3rem] text-muted uppercase tracking-[0.1em]">Direcciones</p>
          <p className="text-[2.4rem] mt-1">{addressCount}</p>
          <Link href="/account/addresses" className="text-[1.25rem] underline">Gestionar</Link>
        </div>
        <div className="border hairline p-5">
          <p className="text-[1.3rem] text-muted uppercase tracking-[0.1em]">Última compra</p>
          <p className="text-[1.5rem] mt-1">{orders[0] ? formatMoney(orders[0].totalCents) : "—"}</p>
          <Link href="/shop" className="text-[1.25rem] underline">Seguir comprando</Link>
        </div>
      </div>

      <h3 className="text-[1.5rem] uppercase tracking-[0.12em] mb-4">Últimos pedidos</h3>
      {orders.length === 0 ? (
        <p className="text-[1.4rem] text-muted">
          Aún no tienes pedidos. <Link href="/shop" className="underline">Ver catálogo</Link>
        </p>
      ) : (
        <ul className="border-t hairline">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap justify-between gap-3 py-4 border-b hairline">
              <div>
                <Link href={`/account/orders/${order.id}`} className="text-[1.4rem] underline">{order.orderNumber}</Link>
                <p className="text-[1.25rem] text-muted">
                  {new Date(order.createdAt).toLocaleDateString("es-ES")} · {order.items.map((i) => `${i.qty}× ${i.productName}`).join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[1.4rem]">{formatMoney(order.totalCents)}</p>
                <p className="text-[1.2rem] text-muted">{order.status}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
