import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { ContactForm } from "@/components/store/contact-form";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactPage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Contacto</h1>
      <div className="grid gap-10 md:grid-cols-2 mt-8">
        <div>
          <p className="text-[1.45rem] text-muted leading-relaxed mb-6">
            ¿Dudas sobre un pedido, una talla o una devolución? Escríbenos y te contestamos
            de lunes a viernes.
          </p>
          <ul className="flex flex-col gap-3 text-[1.4rem]">
            <li>
              Email: <a className="underline" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            </li>
            <li>
              Teléfono: <a className="underline" href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>{BRAND.phone}</a>
            </li>
            <li>
              Instagram / TikTok: <a className="underline" href="https://instagram.com/rebelyn.off" target="_blank" rel="noreferrer">@rebelyn.off</a>
            </li>
          </ul>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
