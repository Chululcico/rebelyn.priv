import type { Metadata } from "next";
import { ReturnRequestForm } from "@/components/store/return-form";

export const metadata: Metadata = { title: "Devoluciones" };

export default function ReturnsPage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Devoluciones</h1>
      <div className="prose-store">
        <p className="text-[1.45rem] text-muted leading-relaxed">
          Tienes 30 días naturales desde la recepción para devolver cualquier prenda sin necesidad
          de justificación. La primera devolución por pedido es gratuita.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Condiciones</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6">
          <li>Las prendas deben estar sin usar, sin lavar y con las etiquetas puestas.</li>
          <li>Por higiene, no se aceptan devoluciones de ropa interior ya desprecintada.</li>
          <li>Guarda el embalaje original: evita etiquetas o cintas directamente sobre la caja.</li>
          <li>El reembolso se emite al mismo método de pago en un plazo de 3–7 días laborables desde la recepción en almacén.</li>
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Cambios de talla</h2>
        <p className="text-[1.4rem] text-muted">
          Si necesitas otra talla, solicita la devolución e indica en el motivo la talla que
          quieres. Te confirmaremos disponibilidad y reservamos la prenda mientras gestionamos el reembolso.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Artículos defectuosos</h2>
        <p className="text-[1.4rem] text-muted">
          Si la prenda llega defectuosa o es la talla equivocada por error nuestro, escríbenos a
          rebelynoff@gmail.com con fotos del artículo y te damos una solución prioritaria.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">Solicitar devolución</h2>
        <p className="text-[1.4rem] text-muted mb-4">
          Introduce el número de pedido y el email de la compra para empezar.
        </p>
      </div>

      <div className="mt-6 max-w-[56rem]">
        <ReturnRequestForm />
      </div>
    </section>
  );
}
