import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { queryProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { ProductCard } from "@/components/store/product-card";
import { WelcomeModal } from "@/components/store/welcome-modal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ items: products }, settings] = await Promise.all([
    queryProducts({ perPage: 100, sort: "newest" }),
    getSettings(),
  ]);
  const standard = settings.shippingMethods.find((m) => m.id === "standard");

  return (
    <>
      <WelcomeModal />

      {/* Portada con imagen fija al iniciar */}
      <section
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url('https://i.postimg.cc/8CvYXBsx/image.png')` }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative text-center px-6 py-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoPng} alt="" width={420} height={420} className="mx-auto w-[min(46vw,26rem)] h-auto" style={{ imageRendering: "crisp-edges" }} />
          <p className="mt-6 text-[1.4rem] uppercase tracking-[0.3em] font-medium text-white" style={{ textShadow: "1px 1px 3px #000, 2px 2px 6px #000" }}>
            {BRAND.tagline}
          </p>
          <p className="mt-2 text-[1.5rem] text-white" style={{ textShadow: "1px 1px 3px #000, 2px 2px 6px #000" }}>
            {BRAND.subline}
          </p>
          <div className="mt-8">
            <Link href="#productos" className="button">
              Ver ropa
            </Link>
          </div>
        </div>
      </section>

      {/* Franja de promesas */}
      <div className="border-y hairline bg-paper">
        <div className="page-width py-4 grid gap-2 md:grid-cols-3 text-center text-[1.3rem] uppercase tracking-[0.14em]">
          <p>Envío {standard ? formatMoney(standard.priceCents) : ""}{standard?.freeOverCents ? ` · gratis desde ${formatMoney(standard.freeOverCents)}` : ""}</p>
          <p>Devolución gratuita en 30 días</p>
          <p>Atención por WhatsApp</p>
        </div>
      </div>

      {/* Todos los productos */}
      <section id="productos" className="page-width py-14">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="title-section mb-0">Productos</h2>
        </div>
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-[1.5rem] text-muted">Todavía no hay productos. Añádelos desde el panel de administración.</p>
        )}
      </section>

      {/* Sección de marca */}
      <section className="bg-wash py-16">
        <div className="page-width max-w-[80rem] text-center">
          <h2 className="title-section">REBELYN</h2>
          <p className="text-[1.5rem] leading-relaxed text-muted">
            Ropa pensada para el día a día: cortes holgados, tejidos que aguantan y detalles que solo se ven si te paras a mirarlos.
            Empezamos con pocos productos y bien hechos; crecemos cuando tiene que crecer.
          </p>
          <div className="mt-8">
            <Link href="/about" className="button button--secondary">
              Sobre nosotros
            </Link>
          </div>
        </div>
      </section>



      {/* Llamada a la acción */}
      <section className="border-y hairline py-14 text-center">
        <div className="page-width">
          <h2 className="title-section">El próximo drop no avisa</h2>
          <p className="text-[1.5rem] text-muted mb-6">Suscríbete al newsletter en el pie y sé el primero en enterarte.</p>
          <Link href="/shop" className="button button--volt">
            Ver la tienda
          </Link>
        </div>
      </section>
    </>
  );
}
