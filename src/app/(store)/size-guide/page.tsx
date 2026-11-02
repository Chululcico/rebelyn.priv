import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guía de tallas" };

const ROWS = [
  { size: "S", chest: "104–110", length: "66–68", sleeve: "60–61" },
  { size: "M", chest: "110–116", length: "68–70", sleeve: "61–62" },
  { size: "L", chest: "116–122", length: "70–72", sleeve: "62–63" },
  { size: "XL", chest: "122–130", length: "72–74", sleeve: "63–64" },
];

export default function SizeGuidePage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Guía de tallas</h1>
      <p className="text-[1.45rem] text-muted mt-4 max-w-[60rem]">
        Todas nuestras prendas son de corte holgado (oversized). Las medidas son del artículo
        plano, en centímetros. Si dudas entre dos tallas, elige la menor.
      </p>

      <div className="overflow-x-auto mt-8 border hairline">
        <table className="w-full text-left text-[1.4rem]">
          <thead>
            <tr className="border-b hairline">
              <th className="p-4 uppercase tracking-[0.1em] text-[1.25rem]">Talla</th>
              <th className="p-4 uppercase tracking-[0.1em] text-[1.25rem]">Pecho (cm)</th>
              <th className="p-4 uppercase tracking-[0.1em] text-[1.25rem]">Largo (cm)</th>
              <th className="p-4 uppercase tracking-[0.1em] text-[1.25rem]">Manga (cm)</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.size} className="border-b hairline last:border-0">
                <td className="p-4">{row.size}</td>
                <td className="p-4">{row.chest}</td>
                <td className="p-4">{row.length}</td>
                <td className="p-4">{row.sleeve}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-10 mb-3">Cómo medir</h2>
      <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6">
        <li><strong>Pecho:</strong> mide de una axila a la otra sobre la prenda plana y multiplica por 2.</li>
        <li><strong>Largo:</strong> desde el cuello (donde empieza la costura) hasta el bajo.</li>
        <li><strong>Manga:</strong> desde la costura de hombro hasta el puño.</li>
      </ul>

      <p className="text-[1.35rem] text-muted mt-8">
        ¿Sigues con dudas? Escríbenos a rebelynoff@gmail.com o por Instagram/TikTok @rebelyn.off.
      </p>
    </section>
  );
}
