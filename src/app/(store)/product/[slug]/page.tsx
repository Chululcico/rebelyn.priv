import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, type ProductCardData } from "@/lib/catalog";
import { formatMoney, isOnSale, percentOff } from "@/lib/money";
import { ProductForm } from "@/components/store/product-form";
import { ProductCard } from "@/components/store/product-card";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "No encontrado" };
  return {
    title: product.name,
    description: product.summary ?? `Compra ${product.name} en REBELYN.`,
    openGraph: {
      title: product.name,
      description: product.summary ?? "",
      images: product.image ? [{ url: product.image }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categorySlug ?? null, 4);
  const onSale = isOnSale(product.priceCents, product.compareAtCents);

  // Datos estructurados JSON-LD para SEO de producto (Google).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary ?? "",
    image: product.images,
    sku: product.id,
    brand: { "@type": "Brand", name: "REBELYN" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: (product.priceCents / 100).toFixed(2),
      highPrice: (product.priceCents / 100).toFixed(2),
      offerCount: product.variantOptions.length,
      availability: product.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };

  // Variantes agrupadas por color para el selector.
  const colorGroups = new Map<string, { name: string; hex: string; variants: { id: string; size: string; stock: number }[] }>();
  for (const option of product.variantOptions) {
    const color = product.colors.find((c) => c.slug === option.colorSlug) ?? { id: "default", name: "Único", hex: "#141414", slug: "" };
    const key = color.id;
    const group = colorGroups.get(key) ?? { name: color.name, hex: color.hex, variants: [] };
    group.variants.push({ id: option.id, size: option.size, stock: option.stock });
    colorGroups.set(key, group);
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="page-width py-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:gap-14">
          {/* Galería */}
          <div className="flex flex-col gap-3 lg:max-w-[42rem] lg:mx-0">
            <div className="bg-wash aspect-[3/4] max-h-[78vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.images[0] ?? ""} alt={product.name} className="w-full h-full object-cover" fetchPriority="high" />
            </div>
            <div className="bg-wash aspect-[3/4] max-h-[78vh] overflow-hidden group cursor-zoom-in" onClick={() => {
              const img = document.querySelector('[data-main-product-img]') as HTMLImageElement | null;
              if (!img) return;
              const overlay = document.createElement("div");
              overlay.className = "fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6 cursor-zoom-out";
              const big = document.createElement("img");
              big.src = img.src;
              big.alt = img.alt;
              big.className = "max-w-[95vw] max-h-[95vh] object-contain rounded";
              overlay.appendChild(big);
              overlay.addEventListener("click", () => overlay.remove());
              document.body.appendChild(overlay);
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img data-main-product-img src={product.images[0] ?? ""} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" fetchPriority="high" />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {product.images.slice(1).map((src) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={src} src={src} alt="" className="w-full aspect-[3/4] object-cover bg-wash cursor-pointer" loading="lazy" onClick={(e) => {
                    const main = document.querySelector('[data-main-product-img]') as HTMLImageElement | null;
                    if (main) {
                      main.src = src;
                    }
                    (e.currentTarget.parentElement?.querySelectorAll('img[data-thumb]') as NodeListOf<HTMLImageElement>).forEach((t) => t.classList.remove('ring-2','ring-ink'));
                    e.currentTarget.classList.add('ring-2','ring-ink');
                  }} data-thumb />
                ))}
              </div>
            )}
          </div>

          {/* Información */}
          <div className="lg:sticky lg:top-24 self-start">
            <h1 className="text-[2.4rem] md:text-[3rem] font-normal uppercase tracking-[0.1em] leading-tight">{product.name}</h1>

            <div className="flex items-center gap-3 mt-4 text-[1.8rem]">
              <span>{formatMoney(product.priceCents)}</span>
              {onSale && (
                <>
                  <s className="text-muted text-[1.5rem]">{formatMoney(product.compareAtCents!)}</s>
                  <span className="text-[1.3rem] bg-ink text-paper px-2 py-0.5">-{percentOff(product.priceCents, product.compareAtCents)}%</span>
                </>
              )}
            </div>

            {product.summary && <p className="mt-5 text-[1.45rem] text-muted leading-relaxed">{product.summary}</p>}

            <ProductForm
              productId={product.id}
              colors={[...colorGroups.values()]}
              onSale={onSale}
              priceCents={product.priceCents}
            />

            <div className="accordion mt-10">
              <details open>
                <summary>Descripción</summary>
                <div className="accordion__content">{product.description ?? product.summary ?? "—"}</div>
              </details>
              {product.details && (
                <details>
                  <summary>Detalles y cuidados</summary>
                  <div className="accordion__content">{product.details}</div>
                </details>
              )}
              <details>
                <summary>Envíos y devoluciones</summary>
                <div className="accordion__content">
                  Envío estándar desde 4,90 €, gratis a partir de 75 €.
                  Devolución gratuita dentro de los 30 días siguientes a la entrega.
                </div>
              </details>
              <details>
                <summary>Guía de tallas</summary>
                <div className="accordion__content">
                  Las prendas son de corte holgado. Si dudas entre dos tallas, elige la menor.
                  <br />
                  <a href="/size-guide" className="underline">Ver guía completa de tallas</a>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="page-width py-12">
          <h2 className="title-section">También te puede gustar</h2>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item as ProductCardData} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
