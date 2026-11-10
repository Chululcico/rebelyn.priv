import type { Metadata } from "next";
import { listShippingMethods } from "@/lib/shipping";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Envíos" };
export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const methods = await listShippingMethods();

  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Envíos</h1>
      <div className="prose-store">
        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Plazos</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6">
          <li>Preparación del pedido: 1–3 días laborables.</li>
          {methods.map((m) => (
            <li key={m.id}>{m.name}: {m.estimatedDays}.</li>
          ))}
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Costes</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6">
          {methods.map((m) => (
            <li key={m.id}>
              {m.name}: {formatMoney(m.priceCents)}
              {m.freeOverCents != null && ` (gratis a partir de ${formatMoney(m.freeOverCents)} de compra)`}.
            </li>
          ))}
          <li>Los gastos se calculan y confirman en el paso de pago, antes de pagar.</li>
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Seguimiento</h2>
        <p className="text-[1.4rem] text-muted">
          Cuando el paquete salga de nuestro almacén recibirás un email con el número de
          seguimiento. También puedes verlo en <em>Mi cuenta → Pedidos</em>.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Dirección incorrecta</h2>
        <p className="text-[1.4rem] text-muted">
          Si te has equivocado en la dirección, escríbenos en cuanto puedas a rebelynoff@gmail.com.
          Si el pedido aún no ha salido, la corregimos; si ya está en camino, te ayudamos con la
          gestoría de la transportista.
        </p>
      </div>
    </section>
  );
}
