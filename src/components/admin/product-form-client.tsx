"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/admin/api-client";
import { ProductEditor, emptyProductForm, toPayload, type ProductFormState } from "./shared";

export function ProductFormClient({
  categories,
  mode,
  productId,
  initial,
}: {
  categories: { id: string; name: string }[];
  mode: "create" | "edit";
  productId?: string;
  initial?: ProductFormState;
}) {
  const router = useRouter();

  async function submit(form: ProductFormState) {
    const payload = toPayload(form);
    if (mode === "create") {
      await api("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
    } else {
      await api(`/api/admin/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-6">{mode === "create" ? "Nuevo producto" : "Editar producto"}</h1>
      <ProductEditor initial={initial ?? emptyProductForm()} categories={categories} onSubmit={submit} submitLabel={mode === "create" ? "Crear producto" : "Guardar cambios"} />
    </div>
  );
}
