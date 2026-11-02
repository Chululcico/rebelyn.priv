import type { Metadata } from "next";
import { ContactDevButtons } from "@/components/store/contact-dev-buttons";

export const metadata: Metadata = {
  title: "Contactar desarrollador",
  description: "Contacto del desarrollador de la tienda REBELYN: Instagram y WhatsApp.",
};

export default function ContactDevPage() {
  return (
    <main className="page-width py-16">
      <div className="max-w-[40rem] mx-auto text-center">
        <h1 className="title-section">Contactar desarrollador</h1>
        <p className="text-[1.4rem] text-muted mb-10">
          ¿Necesitas algo relacionado con la web? Escríbeme por Instagram.
        </p>
        <ContactDevButtons />
      </div>
    </main>
  );
}
