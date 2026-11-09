import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productInputSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { audit } from "@/lib/audit";
import { uniqueProductSlug, upsertColor } from "@/lib/admin/products";

export const runtime = "nodejs";

export const GET = withApi(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 20;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { category: true, images: { orderBy: { position: "asc" } }, variants: { include: { color: true } } },
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, perPage });
});

export const POST = withApi(
  async (request: Request) => {
    const admin = await requireAdmin();
    const input = productInputSchema.parse(await readJson(request));

    const baseSlug = input.slug ? slugify(input.slug) : slugify(input.name);
    const slug = await uniqueProductSlug(baseSlug);

    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: input.name,
          slug,
          summary: input.summary || null,
          description: input.description || null,
          details: input.details || null,
          priceCents: input.priceCents,
          compareAtCents: input.compareAtCents ?? null,
          categoryId: input.categoryId || null,
          featured: input.featured,
          status: input.status,
          weightGrams: input.weightGrams ?? 300,
          lengthCm: input.lengthCm ?? 30,
          widthCm: input.widthCm ?? 20,
          heightCm: input.heightCm ?? 5,
        },
      });

      await tx.productImage.createMany({
        data: input.images.map((img, i) => ({ productId: created.id, url: img.url, alt: img.alt || input.name, position: i })),
      });
      await tx.productTag.createMany({ data: input.tags.map((tag) => ({ productId: created.id, tag })), skipDuplicates: true });

      for (const variant of input.variants) {
        const color = await upsertColor(tx, variant.colorName, variant.colorHex);
        await tx.productVariant.create({
          data: {
            productId: created.id,
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

      // Registrar stock inicial como movimiento de inventario.
      const variants = await tx.productVariant.findMany({ where: { productId: created.id } });
      for (const v of variants) {
        if (v.stock > 0) {
          await tx.inventoryMovement.create({
            data: { variantId: v.id, before: 0, after: v.stock, change: v.stock, reason: "Alta de producto", adminUserId: admin.id },
          });
        }
      }

      return created;
    });

    await audit({ adminUserId: admin.id, action: "product.create", entity: "Product", entityId: product.id, after: { name: product.name, slug: product.slug } });
    return NextResponse.json({ product }, { status: 201 });
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000, key: "admin-product-create" } },
);
