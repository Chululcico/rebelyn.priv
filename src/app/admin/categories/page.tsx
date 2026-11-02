import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/managers";

export const metadata: Metadata = { title: "Categorías" };

export default function AdminCategoriesPage() {
  return <CategoriesManager />;
}
