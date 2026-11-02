"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";
import { formatMoney } from "@/lib/money";
import { Pagination, SearchBar } from "./shared";

type Product = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  status: string;
  featured: boolean;
  category: { name: string } | null;
  images: { url: string }[];
  variants: { stock: number }[];
};

export function ProductsTable() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const page = Number(sp.get("page") ?? 1);
  const [data, setData] = useState<{ products: Product[]; total: number; page: number; perPage: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ products: Product[]; total: number; page: number; perPage: number }>(`/api/admin/products?q=${encodeURIComponent(q)}&page=${page}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [q, page]);

  async function remove(id: string) {
    if (!confirm("¿Archivar o eliminar este producto?")) return;
    await api(`/api/admin/products/${id}`, { method: "DELETE" });
    const fresh = await api<{ products: Product[]; total: number; page: number; perPage: number }>(`/api/admin/products?q=${encodeURIComponent(q)}&page=${page}`);
    setData(fresh);
  }

  if (error) return <p className="text-[1.4rem] text-magenta">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="text-[2.2rem] uppercase tracking-[0.12em]">Productos</h1>
        <Link href="/admin/products/new" className="button">+ Nuevo producto</Link>
      </div>

      <SearchBar placeholder="Buscar por nombre o slug…" path="/admin/products" />

      {!data ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <>
          <div className="overflow-x-auto border hairline bg-paper">
            <table className="w-full text-left text-[1.3rem]">
              <thead>
                <tr className="border-b hairline">
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Producto</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Categoría</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Precio</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Stock</th>
                  <th className="p-3 text-[1.15rem] uppercase tracking-[0.08em]">Estado</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {data.products.map((product) => {
                  const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                  return (
                    <tr key={product.id} className="border-b hairline last:border-0">
                      <td className="p-3">
                        <span className="flex items-center gap-3">
                          {product.images[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0].url} alt="" className="w-10 h-13 object-cover bg-wash" />
                          )}
                          <span>
                            {product.name}
                            {product.featured && <span className="ml-2 text-[1.05rem] text-volt-dark">★</span>}
                            <span className="block text-[1.1rem] text-muted">/{product.slug}</span>
                          </span>
                        </span>
                      </td>
                      <td className="p-3 text-muted">{product.category?.name ?? "—"}</td>
                      <td className="p-3">{formatMoney(product.priceCents)}</td>
                      <td className={`p-3 ${stock === 0 ? "text-magenta" : ""}`}>{stock}</td>
                      <td className="p-3">
                        <span className={`text-[1.15rem] uppercase ${product.status === "ACTIVE" ? "text-volt-dark" : product.status === "DRAFT" ? "text-muted" : "text-magenta"}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Link className="underline mr-3" href={`/admin/products/${product.id}`}>Editar</Link>
                        <button type="button" className="underline text-muted" onClick={() => remove(product.id)}>Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} perPage={data.perPage} total={data.total} basePath="/admin/products" />
        </>
      )}
    </div>
  );
}
