import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

export async function uniqueProductSlug(base: string): Promise<string> {
  let slug = base || "producto";
  let counter = 1;
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export async function upsertColor(tx: Prisma.TransactionClient, name: string, hex: string) {
  const slug = slugify(name);
  const existing = await tx.color.findUnique({ where: { slug } });
  if (existing) {
    if (existing.hex !== hex) return tx.color.update({ where: { id: existing.id }, data: { hex } });
    return existing;
  }
  return tx.color.create({ data: { name, slug, hex } });
}
