import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

export const metadata = { title: { template: "%s · Admin REBELYN", default: "Admin REBELYN" } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/categories", label: "Categorías" },
  { href: "/admin/inventory", label: "Inventario" },
  { href: "/admin/shipping", label: "Envíos (Correos)" },
  { href: "/admin/customers", label: "Clientes" },
  { href: "/admin/discounts", label: "Descuentos" },
  { href: "/admin/returns", label: "Devoluciones" },
  { href: "/admin/messages", label: "Mensajes" },
  { href: "/admin/settings", label: "Ajustes" },
  { href: "/admin/audit", label: "Auditoría" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role === "CUSTOMER") redirect("/account");

  return (
    <div className="min-h-screen grid md:grid-cols-[24rem_1fr]">
      <aside className="border-r hairline p-5 bg-paper md:min-h-screen">
        <Link href="/" className="block mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoPng} alt="REBELYN" className="h-10 w-auto" />
        </Link>
        <p className="text-[1.2rem] uppercase tracking-[0.16em] text-muted mb-4">Panel admin · {user.role}</p>
        <nav className="flex flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-2.5 px-3 text-[1.4rem] uppercase tracking-[0.1em] border-b hairline hover:bg-wash"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="mt-6">
          <button type="submit" className="text-[1.3rem] underline text-muted">Cerrar sesión</button>
        </form>
      </aside>
      <main className="p-5 md:p-8 bg-wash min-h-screen">{children}</main>
    </div>
  );
}
