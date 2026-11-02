import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ProductFormClient } from "@/components/admin/product-form-client";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } });
  return <ProductFormClient categories={categories} mode="create" />;
}
