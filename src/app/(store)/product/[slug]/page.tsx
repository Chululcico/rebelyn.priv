import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, type ProductCardData } from "@/lib/catalog";
import { formatMoney, isOnSale, percentOff } from "@/lib/money";
import { ProductForm } from "@/components/store/product-form";
import { ProductCard } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";

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
          <ProductGallery images={product.images} name={product.name} />

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
