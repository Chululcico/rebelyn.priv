import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categoryInputSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi<Ctx>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = categoryInputSchema.partial().parse(await readJson(request));

  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

  const category = await db.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.image !== undefined ? { image: input.image || null } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId || null } : {}),
    },
  });

  await audit({ adminUserId: admin.id, action: "category.update", entity: "Category", entityId: id });
  return NextResponse.json({ category });
});

export const DELETE = withApi<Ctx>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const products = await db.product.count({ where: { categoryId: id } });
  if (products > 0) {
    return NextResponse.json({ error: `Hay ${products} productos en esta categoría. Muévelos antes de borrarla.` }, { status: 400 });
  }
  await db.category.delete({ where: { id } });
  await audit({ adminUserId: admin.id, action: "category.delete", entity: "Category", entityId: id });
  return NextResponse.json({ ok: true });
});
