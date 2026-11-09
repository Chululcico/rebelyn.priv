import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductFormClient } from "@/components/admin/product-form-client";
import type { ProductFormState } from "@/components/admin/shared";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } }, variants: { include: { color: true } }, tags: true },
    }),
    db.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  const initial: ProductFormState = {
    name: product.name,
    slug: product.slug,
    summary: product.summary ?? "",
    description: product.description ?? "",
    details: product.details ?? "",
    price: (product.priceCents / 100).toFixed(2),
    compareAt: product.compareAtCents != null ? (product.compareAtCents / 100).toFixed(2) : "",
    categoryId: product.categoryId ?? "",
    featured: product.featured,
    status: product.status,
    tags: product.tags.map((t) => t.tag).join(", "),
    images: product.images.map((img) => img.url),
    weightGrams: String((product as any).weightGrams ?? 300),
    lengthCm: String((product as any).lengthCm ?? 30),
    widthCm: String((product as any).widthCm ?? 20),
    heightCm: String((product as any).heightCm ?? 5),
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colorName: v.color?.name ?? "Único",
      colorHex: v.color?.hex ?? "#141414",
      stock: v.stock,
      sku: v.sku ?? "",
      weightGrams: (v as any).weightGrams != null ? String((v as any).weightGrams) : "",
      lengthCm: (v as any).lengthCm != null ? String((v as any).lengthCm) : "",
      widthCm: (v as any).widthCm != null ? String((v as any).widthCm) : "",
      heightCm: (v as any).heightCm != null ? String((v as any).heightCm) : "",
    })),
  };

  return <ProductFormClient categories={categories} mode="edit" productId={id} initial={initial} />;
}
