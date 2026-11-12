import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { code39Pattern } from "@/lib/barcode";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Etiqueta de envío" };

type Props = { params: Promise<{ id: string }> };

function kg(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}

export default async function ShippingLabelPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role === "CUSTOMER") redirect("/admin/login");

  const { id } = await params;

  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { weightGrams: true, lengthCm: true, widthCm: true, heightCm: true } },
              },
            },
          },
        },
      },
    }),
    getSettings(),
  ]);

  if (!order) notFound();

  const method = settings.shippingMethods.find((m) => m.id === order.shippingMethod);
  const itemGrams = order.items.reduce((sum, item) => {
    const variant = item.variant;
    const grams = variant?.weightGrams ?? variant?.product?.weightGrams ?? 300;
    return sum + grams * item.qty;
  }, 0);
  const totalGrams = itemGrams + 60; // sobre/caja + relleno

  const boxItem = order.items.find((item) => item.variant?.product);
  const dims = boxItem
    ? `${boxItem.variant?.product?.lengthCm ?? 30} × ${boxItem.variant?.product?.widthCm ?? 20} × ${boxItem.variant?.product?.heightCm ?? 5} cm`
    : "30 × 20 × 5 cm";

  const code = (order.trackingNumber?.replace(/\s+/g, "") || order.orderNumber).replace(/[^A-Za-z0-9\-./+%$ ]/g, "");
  const barcode = code39Pattern(code);
  const units = order.items.reduce((sum, item) => sum + item.qty, 0);
  const pickup = method?.name ?? "Envío estándar";

  return (
    <div className="min-h-screen bg-wash py-8 px-4 print:bg-white print:p-0">
      <style>{`
        @page { size: A6 portrait; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .label-sheet { box-shadow: none !important; margin: 0 auto !important; border: 0 !important; }
        }
      `}</style>

      <div className="mx-auto max-w-[64rem]">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/admin/orders/${order.id}`} className="text-[1.3rem] underline text-muted">
              ← Volver al pedido
            </Link>
            <h1 className="text-[2rem] uppercase tracking-[0.12em] mt-2">Etiqueta de envío</h1>
            <p className="text-[1.25rem] text-muted mt-1 max-w-[52rem]">
              Formato A6 (105 × 148 mm). Imprímela y pégala en el paquete. Correos genera su propio código de
              seguimiento al contratar el envío; si ya has guardado un nº de seguimiento en el pedido, se usa en el
              código de barras.
            </p>
            {settings.address.includes("[") && (
              <p className="text-[1.2rem] text-magenta mt-2">
                Aviso: la dirección del remitente está sin configurar. Rellena «Dirección fiscal» en Ajustes para que la
                etiqueta salga completa.
              </p>
            )}
          </div>
          <PrintButton />
        </div>

        {/* Hoja A6 */}
        <div
          className="label-sheet mx-auto bg-white text-black shadow-[0_10px_40px_rgb(0_0_0/12%)] border border-black/10"
          style={{ width: "105mm", minHeight: "148mm", padding: "6mm", display: "flex", flexDirection: "column", gap: "4mm" }}
        >
          <div className="flex items-center justify-between border-b-2 border-black pb-[2mm]">
            <span className="text-[5mm] font-bold tracking-[0.22em]">REBELYN</span>
            <span className="text-[3mm] uppercase tracking-[0.14em]">{pickup}</span>
          </div>

          <div>
            <p className="text-[2.4mm] uppercase tracking-[0.18em] text-black/60 mb-[0.8mm]">Remitente</p>
            <p className="text-[3.1mm] leading-snug">
              <strong>{settings.legalName && !settings.legalName.includes("[") ? settings.legalName : settings.storeName}</strong>
              <br />
              {settings.address}
              <br />
              {settings.contactPhone} · {settings.contactEmail}
            </p>
          </div>

          <div className="border-[0.5mm] border-black p-[2.5mm]">
            <p className="text-[2.4mm] uppercase tracking-[0.18em] text-black/60 mb-[0.8mm]">Destinatario</p>
            <p className="text-[4mm] font-bold leading-snug">{order.shipName}</p>
            <p className="text-[3.4mm] leading-snug mt-[0.8mm]">
              {order.shipLine1}
              {order.shipLine2 ? `, ${order.shipLine2}` : ""}
              <br />
              <strong>
                {order.shipPostalCode} {order.shipCity}
              </strong>
              <br />
              {order.shipProvince} · {order.shipCountry}
              {order.phone ? (
                <>
                  <br />
                  Tel. {order.phone}
                </>
              ) : null}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-[2mm] text-[2.9mm]">
            <div>
              <p className="text-[2.2mm] uppercase tracking-[0.16em] text-black/60">Pedido</p>
              <p className="font-bold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-[2.2mm] uppercase tracking-[0.16em] text-black/60">Bultos / uds</p>
              <p className="font-bold">
                1 / {units}
              </p>
            </div>
            <div>
              <p className="text-[2.2mm] uppercase tracking-[0.16em] text-black/60">Peso</p>
              <p className="font-bold">{kg(totalGrams)}</p>
            </div>
            <div>
              <p className="text-[2.2mm] uppercase tracking-[0.16em] text-black/60">Medidas</p>
              <p className="font-bold">{dims}</p>
            </div>
          </div>

          <div className="mt-auto">
            <svg
              viewBox={`0 0 ${barcode.total} 34`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Código de barras ${code}`}
              style={{ width: "100%", height: "16mm", display: "block" }}
            >
              <rect x={0} y={0} width={barcode.total} height={34} fill="#fff" />
              {barcode.bars.map((bar, index) => (
                <rect key={index} x={bar.x} y={0} width={bar.w} height={34} fill="#000" />
              ))}
            </svg>
            <p className="mt-[1mm] text-center text-[3.2mm] tracking-[0.3em]">{code}</p>
            <p className="mt-[1.5mm] border-t border-black/20 pt-[1.5mm] text-center text-[2.3mm] uppercase tracking-[0.12em] text-black/60">
              Entrega a domicilio · {settings.storeName} · Rebelyn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
