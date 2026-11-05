import type { Metadata } from "next";
import { db } from "@/lib/db";
import { InventoryManager } from "@/components/admin/managers";

export const metadata: Metadata = { title: "Inventario" };
export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const variants = await db.productVariant.findMany({
    include: { product: { select: { name: true } }, color: { select: { name: true } } },
    orderBy: { product: { name: "asc" } },
  });

  return (
    <InventoryManager
      variants={variants.map((v) => ({ id: v.id, label: `${v.product.name} · ${v.size}${v.color ? ` · ${v.color.name}` : ""} (${v.stock} uds)` }))}
    />
  );
}
