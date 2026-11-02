import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aviso legal" };

export default function LegalPage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Aviso legal</h1>
      <div className="prose-store">
        <p className="text-[1.35rem] text-muted">
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se facilitan los siguientes datos:
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">1. Datos identificativos del titular</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted">
          <li><strong>Titular de la web:</strong> REBELYN</li>
          <li><strong>Correo electrónico:</strong> <a className="underline" href="mailto:rebelynoff@gmail.com">rebelynoff@gmail.com</a></li>
          <li><strong>Teléfono:</strong> 632 530 973</li>
          <li><strong>Dominio:</strong> rebelyn.net</li>
          <li><strong>Actividad:</strong> Comercio electrónico de prendas de ropa, calzado y complementos.</li>
          <li><strong>NIF/CIF/DNI:</strong> A facilitar a requerimiento de las autoridades competentes, conforme a la normativa aplicable.</li>
          <li><strong>Domicilio fiscal:</strong> A facilitar a requerimiento de las autoridades competentes.</li>
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">2. Objeto</h2>
        <p className="text-[1.4rem] text-muted">
          El presente aviso legal regula el uso del sitio web rebelyn.net, del que es titular REBELYN. La navegación por el sitio atribuye la condición de usuario e implica la aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en este Aviso Legal.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">3. Propiedad intelectual e industrial</h2>
        <p className="text-[1.4rem] text-muted">
          Todos los contenidos del sitio web, incluyendo, a título enunciativo pero no limitativo, textos, fotografías, gráficos, imágenes, iconos, logotipos, marcas, nombres comerciales, diseño gráfico, código fuente y software, son propiedad de REBELYN o de terceros que han autorizado su uso, estando protegidos por las leyes españolas y europeas sobre propiedad intelectual e industrial.
        </p>
        <p className="text-[1.4rem] text-muted mt-4">
          Queda expresamente prohibida la reproducción, distribución, comunicación pública, transformación o cualquier otra forma de explotación, total o parcial, de los citados contenidos sin la autorización escrita y expresa de REBELYN.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">4. Responsabilidad</h2>
        <p className="text-[1.4rem] text-muted">
          REBELYN no se hace responsable de los daños y perjuicios que pudieran derivarse de interferencias, omisiones, interrupciones, virus informáticos, averías telefónicas o desconexiones motivadas por causas ajenas al titular, ni de retrasos o bloqueos en el funcionamiento del sitio web por causas de fuerza mayor.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">5. Enlaces externos</h2>
        <p className="text-[1.4rem] text-muted">
          En el caso de que el sitio web contenga enlaces a otras páginas web, REBELYN no ejercerá ningún tipo de control sobre dichas páginas ni contenidos. No asumirá responsabilidad alguna por los contenidos de algún enlace perteneciente a un sitio web ajeno, ni garantizará la disponibilidad técnica, calidad, fiabilidad, exactitud, amplitud, veracidad, validez y constitucionalidad de los mismos.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">6. Legislación aplicable y jurisdicción</h2>
        <p className="text-[1.4rem] text-muted">
          La relación entre REBELYN y el usuario se regirá por la vigente legislación española. Para la resolución de cualquier controversia que pudiera derivarse de la navegación por el sitio web, ambas partes se someterán a los Juzgados y Tribunales que correspondan conforme a derecho.
        </p>
      </div>
    </section>
  );
}
