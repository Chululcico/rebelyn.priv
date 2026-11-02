import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categoryInputSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = withApi(async () => {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { products: true } }, parent: true } });
  return NextResponse.json({ categories });
});

export const POST = withApi(async (request: Request) => {
  const admin = await requireAdmin();
  const input = categoryInputSchema.parse(await readJson(request));
  const slug = slugify(input.slug || input.name);

  const exists = await db.category.findUnique({ where: { slug } });
  if (exists) return NextResponse.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 });

  const category = await db.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description || null,
      image: input.image || null,
      order: input.order,
      parentId: input.parentId || null,
    },
  });

  await audit({ adminUserId: admin.id, action: "category.create", entity: "Category", entityId: category.id, after: { name: category.name } });
  return NextResponse.json({ category }, { status: 201 });
});
