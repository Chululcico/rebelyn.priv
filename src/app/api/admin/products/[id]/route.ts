import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productInputSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { audit } from "@/lib/audit";
import { uniqueProductSlug, upsertColor } from "@/lib/admin/products";
import { restoreStock } from "@/lib/stock";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true, images: { orderBy: { position: "asc" } }, variants: { include: { color: true } }, tags: true },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  return NextResponse.json({ product });
});

export const PATCH = withApi<Ctx>(
  async (request, { params }) => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = productInputSchema.partial().parse(await readJson(request));

    const existing = await db.product.findUnique({ where: { id }, include: { variants: true } });
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const product = await db.$transaction(async (tx) => {
      if (input.name !== undefined || input.slug !== undefined) {
        const base = input.slug ? slugify(input.slug) : input.name ? slugify(input.name) : existing.slug;
        if (base !== existing.slug) {
          const slug = await uniqueProductSlug(base);
          await tx.product.update({ where: { id }, data: { slug } });
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.summary !== undefined ? { summary: input.summary || null } : {}),
          ...(input.description !== undefined ? { description: input.description || null } : {}),
          ...(input.details !== undefined ? { details: input.details || null } : {}),
          ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
          ...(input.compareAtCents !== undefined ? { compareAtCents: input.compareAtCents } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}),
          ...(input.featured !== undefined ? { featured: input.featured } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.weightGrams !== undefined ? { weightGrams: input.weightGrams } : {}),
          ...(input.lengthCm !== undefined ? { lengthCm: input.lengthCm } : {}),
          ...(input.widthCm !== undefined ? { widthCm: input.widthCm } : {}),
          ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
        },
      });

      if (input.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: input.images.map((img, i) => ({ productId: id, url: img.url, alt: img.alt || updated.name, position: i })),
        });
      }

      if (input.tags) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        await tx.productTag.createMany({ data: input.tags.map((tag) => ({ productId: id, tag })), skipDuplicates: true });
      }

      if (input.variants) {
        // Se reconstruyen las variantes. Las que se conservan (mismo id) mantienen
        // su id y su stock solo si el admin no envía un stock nuevo explícito.
        for (const variant of input.variants) {
          const color = await upsertColor(tx, variant.colorName, variant.colorHex);
          if (variant.id) {
            const current = existing.variants.find((v) => v.id === variant.id);
            if (current) {
              const newStock = variant.stock;
              if (newStock !== current.stock) {
                await tx.productVariant.update({
                  where: { id: variant.id },
                  data: {
                    size: variant.size,
                    colorId: color.id,
                    stock: newStock,
                    priceCents: variant.priceCents ?? null,
                    sku: variant.sku || null,
                    weightGrams: variant.weightGrams ?? null,
                    lengthCm: variant.lengthCm ?? null,
                    widthCm: variant.widthCm ?? null,
                    heightCm: variant.heightCm ?? null,
                  },
                });
                await tx.inventoryMovement.create({
                  data: {
                    variantId: variant.id,
                    before: current.stock,
                    after: newStock,
                    change: newStock - current.stock,
                    reason: "Edición de producto",
                    adminUserId: admin.id,
                  },
                });
              } else {
                await tx.productVariant.update({
                  where: { id: variant.id },
                  data: {
                    size: variant.size,
                    colorId: color.id,
                    priceCents: variant.priceCents ?? null,
                    sku: variant.sku || null,
                    weightGrams: variant.weightGrams ?? null,
                    lengthCm: variant.lengthCm ?? null,
                    widthCm: variant.widthCm ?? null,
                    heightCm: variant.heightCm ?? null,
                  },
                });
              }
              continue;
            }
          }
          await tx.productVariant.create({
            data: {
              productId: id,
              colorId: color.id,
              size: variant.size,
              stock: variant.stock,
              priceCents: variant.priceCents ?? null,
              sku: variant.sku || null,
              weightGrams: variant.weightGrams ?? null,
              lengthCm: variant.lengthCm ?? null,
              widthCm: variant.widthCm ?? null,
              heightCm: variant.heightCm ?? null,
            },
          });
        }

        // Variantes eliminadas del formulario: su stock vuelve al inventario histórico
        // y se borran (el historial de movimientos y pedidos se conserva con snapshot).
        const keepIds = input.variants.map((v) => v.id).filter(Boolean) as string[];
        const removed = existing.variants.filter((v) => !keepIds.includes(v.id));
        if (removed.length) {
          await restoreStock(tx, removed.map((v) => ({ variantId: v.id, qty: v.stock })), "Variante eliminada", admin.id);
          await tx.productVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
        }
      }

      return tx.product.findUniqueOrThrow({ where: { id }, include: { variants: { include: { color: true } }, images: { orderBy: { position: "asc" as const } } } });
    });

    await audit({ adminUserId: admin.id, action: "product.update", entity: "Product", entityId: id, after: { name: product.name } });
    return NextResponse.json({ product });
  },
  { rateLimit: { limit: 60, windowMs: 60 * 1000, key: "admin-product-update" } },
);

export const DELETE = withApi<Ctx>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const existing = await db.product.findUnique({ where: { id }, select: { name: true, slug: true } });
  if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  // Archivar en lugar de borrar si ya hay pedidos que lo referencian.
  const hasOrders = await db.orderItem.count({ where: { productSlug: existing.slug } });
  if (hasOrders > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit({ adminUserId: admin.id, action: "product.archive", entity: "Product", entityId: id });
    return NextResponse.json({ ok: true, archived: true });
  }

  await db.product.delete({ where: { id } });
  await audit({ adminUserId: admin.id, action: "product.delete", entity: "Product", entityId: id, before: { name: existing.name } });
  return NextResponse.json({ ok: true });
});
