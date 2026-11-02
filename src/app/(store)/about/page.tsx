import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sobre REBELYN" };

export default function AboutPage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Sobre REBELYN</h1>
      <div className="prose-store">
        <p className="text-[1.55rem] leading-relaxed">
          REBELYN nace de una idea sencilla: la ropa no debería pedirte permiso.
        </p>
        <p className="text-[1.45rem] leading-relaxed text-muted">
          Diseñamos prendas para quien no encaja en moldes ajenos. Chandal, sudaderas, camisetas y
          complementos con actitud streetwear, pensados para el día a día y para decir algo sin decir nada.
        </p>
        <p className="text-[1.45rem] leading-relaxed text-muted">
          Producción en series cortas, tejidos cómodos y un corte holgado que se mueve contigo.
          Sin colecciones infinitas: solo lo que nos gustaría llevar.
        </p>
        <p className="text-[1.6rem] uppercase tracking-[0.2em] mt-10">Rompe con lo común.</p>
        <p className="text-[1.35rem] text-muted mt-6">
          ¿Hablamos? Escríbenos a <a className="underline" href="mailto:rebelynoff@gmail.com">rebelynoff@gmail.com</a> o
          encuéntranos en Instagram y TikTok <strong>@rebelyn.off</strong>.
        </p>
      </div>
    </section>
  );
}
