import type { Metadata } from "next";
import { buildProductWhere, getCatalogFacets, queryProducts, toCardData } from "@/lib/catalog";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/store/product-card";
import { ShopFilters } from "@/components/store/shop-filters";

export const metadata: Metadata = {
  title: "Shop",
  description: "Toda la ropa REBELYN: chandales, sudaderas, camisetas y más.",
};

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;

  const q = one(params.q) ?? "";
  const category = one(params.category) ?? "";
  const size = one(params.size) ?? "";
  const color = one(params.color) ?? "";
  const availability = one(params.availability) === "in_stock" ? ("in_stock" as const) : ("all" as const);
  const sort = (one(params.sort) ?? "newest") as "newest" | "price_asc" | "price_desc" | "name";
  const page = Math.max(1, Number(one(params.page) ?? 1));
  const minPrice = one(params.min) ? Math.round(Number(one(params.min)) * 100) : undefined;
  const maxPrice = one(params.max) ? Math.round(Number(one(params.max)) * 100) : undefined;

  const filters = {
    q: q || undefined,
    category: category || undefined,
    sizes: size ? [size] : undefined,
    colors: color ? [color] : undefined,
    availability,
    sort,
    page,
    perPage: 24,
    minPrice,
    maxPrice,
  };

  const [{ items, total, perPage }, categories, facets] = await Promise.all([
    queryProducts(filters),
    db.category.findMany({ orderBy: { order: "asc" }, where: { parentId: null } }),
    getCatalogFacets(buildProductWhere({ ...filters, page: undefined, perPage: undefined })),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const title = q ? `Resultados para “${q}”` : category ? categories.find((c) => c.slug === category)?.name ?? "Catálogo" : "Catálogo";

  return (
    <section className="page-width py-10">
      <h1 className="title-section">{title}</h1>

      <ShopFilters
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        sizes={facets.sizes}
        colors={facets.colors}
        total={total}
      />

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-[1.6rem] mb-6">Ninguna prenda coincide con estos filtros.</p>
          <a href="/shop" className="button">Quitar filtros</a>
        </div>
      ) : (
        <>
          <div className="product-grid mt-6">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-12" aria-label="Paginación">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const url = new URLSearchParams();
                for (const [key, value] of Object.entries(params)) {
                  if (typeof value === "string" && key !== "page") url.set(key, value);
                }
                if (p > 1) url.set("page", String(p));
                return (
                  <a
                    key={p}
                    href={`/shop?${url.toString()}`}
                    className={`w-10 h-10 flex items-center justify-center border text-[1.3rem] ${
                      p === page ? "bg-ink text-paper border-ink" : "hairline border hover:border-ink"
                    }`}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </a>
                );
              })}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
