import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { isOnSale, percentOff } from "@/lib/money";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  priceCents: number;
  compareAtCents: number | null;
  onSale: boolean;
  discountPercent: number;
  featured: boolean;
  image: string | null;
  hoverImage: string | null;
  images: string[];
  categorySlug: string | null;
  categoryName: string | null;
  colors: { id: string; slug: string; name: string; hex: string }[];
  sizes: { size: string; inStock: boolean; totalStock: number }[];
  variantOptions: { id: string; size: string; colorSlug: string | null; stock: number }[];
  totalStock: number;
  soldOut: boolean;
};

export type ProductFilters = {
  q?: string;
  category?: string;
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  availability?: "all" | "in_stock";
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  featured?: boolean;
  page?: number;
  perPage?: number;
};

const cardInclude = {
  images: { orderBy: { position: "asc" as const } },
  category: true,
  variants: { include: { color: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toCardData(product: ProductWithRelations): ProductCardData {
  const images = product.images.map((img) => img.url);
  const colorMap = new Map<string, { id: string; slug: string; name: string; hex: string }>();
  for (const variant of product.variants) {
    if (variant.color) {
      colorMap.set(variant.color.id, { id: variant.color.id, slug: variant.color.slug, name: variant.color.name, hex: variant.color.hex });
    }
  }
  const sizeMap = new Map<string, { size: string; inStock: boolean; totalStock: number }>();
  for (const variant of product.variants) {
    const entry = sizeMap.get(variant.size) ?? { size: variant.size, inStock: false, totalStock: 0 };
    entry.totalStock += variant.stock;
    entry.inStock = entry.inStock || variant.stock > 0;
    sizeMap.set(variant.size, entry);
  }
  const sizes = [...sizeMap.values()].sort((a, b) => a.size.localeCompare(b.size, "es", { numeric: true }));
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const variantOptions = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    colorSlug: v.color?.slug ?? null,
    stock: v.stock,
  }));

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    summary: product.summary,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    onSale: isOnSale(product.priceCents, product.compareAtCents),
    discountPercent: percentOff(product.priceCents, product.compareAtCents),
    featured: product.featured,
    image: images[0] ?? null,
    hoverImage: images[1] ?? images[0] ?? null,
    images,
    categorySlug: product.category?.slug ?? null,
    categoryName: product.category?.name ?? null,
    colors: [...colorMap.values()],
    sizes,
    variantOptions,
    totalStock,
    soldOut: totalStock <= 0,
  };
}

/** Construye el WHERE de una búsqueda de catálogo. */
export function buildProductWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (filters.featured) where.featured = true;

  if (filters.q) {
    const q = filters.q.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { some: { tag: { contains: q, mode: "insensitive" } } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
  }

  if (filters.category) {
    where.category = { slug: filters.category };
  }

  if (filters.sizes?.length) {
    where.variants = { some: { size: { in: filters.sizes }, ...(filters.availability === "in_stock" ? { stock: { gt: 0 } } : {}) } };
  }

  if (filters.colors?.length) {
    const colorClause: Prisma.ProductVariantWhereInput = { color: { slug: { in: filters.colors } } };
    if (filters.availability === "in_stock") colorClause.stock = { gt: 0 };
    const previousAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
    where.AND = [...previousAnd, { variants: { some: colorClause } }];
  }

  if (filters.minPrice != null || filters.maxPrice != null) {
    where.priceCents = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.availability === "in_stock" && !filters.sizes?.length && !filters.colors?.length) {
    where.variants = { ...(where.variants as Prisma.ProductVariantWhereInput | undefined), some: { stock: { gt: 0 } } };
  }

  return where;
}

export function buildOrderBy(sort: ProductFilters["sort"]): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { priceCents: "asc" };
    case "price_desc":
      return { priceCents: "desc" };
    case "name":
      return { name: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function queryProducts(filters: ProductFilters): Promise<{ items: ProductCardData[]; total: number; page: number; perPage: number }> {
  const perPage = filters.perPage ?? 24;
  const page = Math.max(1, filters.page ?? 1);
  const where = buildProductWhere(filters);
  const orderBy = buildOrderBy(filters.sort);

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (page - 1) * perPage, take: perPage, include: cardInclude }),
  ]);

  return { items: products.map(toCardData), total, page, perPage };
}

export async function getProductBySlug(slug: string): Promise<
  (ProductCardData & { description: string | null; details: string | null; categoryName: string | null }) | null
> {
  const product = await db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: cardInclude,
  });
  if (!product) return null;
  const card = toCardData(product);
  return { ...card, description: product.description, details: product.details, categoryName: product.category?.name ?? null };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const products = await db.product.findMany({
    where: { status: "ACTIVE", featured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: cardInclude,
  });
  return products.map(toCardData);
}

export async function getNewProducts(limit = 8): Promise<ProductCardData[]> {
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: cardInclude,
  });
  return products.map(toCardData);
}

export async function getRelatedProducts(productId: string, categorySlug: string | null, limit = 4): Promise<ProductCardData[]> {
  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: productId },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: { featured: "desc" },
    take: limit,
    include: cardInclude,
  });
  return products.map(toCardData);
}

/** Facetas del catálogo: colores y tallas disponibles entre los productos dados. */
export async function getCatalogFacets(baseWhere: Prisma.ProductWhereInput) {
  const variants = await db.productVariant.findMany({
    where: { product: baseWhere },
    select: { size: true, stock: true, color: { select: { id: true, name: true, slug: true, hex: true } } },
    take: 2000,
  });

  const sizes = new Map<string, number>();
  const colors = new Map<string, { id: string; name: string; slug: string; hex: string; count: number }>();
  for (const v of variants) {
    if (v.stock > 0) {
      sizes.set(v.size, (sizes.get(v.size) ?? 0) + 1);
      if (v.color) {
        const entry = colors.get(v.color.slug) ?? { ...v.color, count: 0 };
        entry.count += 1;
        colors.set(v.color.slug, entry);
      }
    }
  }

  return {
    sizes: [...sizes.entries()].map(([size]) => size).sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    colors: [...colors.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

/** Resultados de búsqueda predictiva (máx 6). */
export async function searchProducts(q: string, limit = 6): Promise<ProductCardData[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
        { tags: { some: { tag: { contains: term, mode: "insensitive" } } } },
      ],
    },
    take: limit,
    include: cardInclude,
  });
  return products.map(toCardData);
}
