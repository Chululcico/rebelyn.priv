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
      {/* En móvil la navegación es una fila horizontal desplazable; en
          escritorio vuelve a ser la barra lateral de siempre. */}
      <aside className="border-b hairline bg-paper md:border-b-0 md:border-r md:min-h-screen md:p-5">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-0 md:pt-0 md:mb-6">
          <Link href="/" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoUi} alt="REBELYN" className="h-9 w-auto md:h-10" />
          </Link>
          <form action="/api/auth/logout" method="post" className="md:hidden">
            <button type="submit" className="text-[1.2rem] underline text-muted">Salir</button>
          </form>
        </div>
        <p className="hidden md:block text-[1.2rem] uppercase tracking-[0.16em] text-muted mb-4">
          Panel admin · {user.role}
        </p>
        <nav className="flex gap-2 overflow-x-auto px-4 py-3 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:py-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-full border hairline px-3 py-1.5 text-[1.2rem] uppercase tracking-[0.08em] hover:bg-wash md:rounded-none md:border-0 md:border-b md:border-hairline md:px-3 md:py-2.5 md:text-[1.4rem] md:tracking-[0.1em]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="hidden md:block mt-6">
          <button type="submit" className="text-[1.3rem] underline text-muted">Cerrar sesión</button>
        </form>
      </aside>
      <main className="min-w-0 p-4 md:p-8 bg-wash min-h-screen">{children}</main>
    </div>
  );
}
