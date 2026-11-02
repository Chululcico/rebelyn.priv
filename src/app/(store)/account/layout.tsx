import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  return (
    <section className="page-width py-10">
      <div className="grid gap-10 md:grid-cols-[22rem_1fr]">
        <aside>
          <h1 className="text-[1.8rem] uppercase tracking-[0.14em] mb-1">Mi cuenta</h1>
          <p className="text-[1.3rem] text-muted mb-6">{user.email}</p>
          <nav className="flex flex-col border-t hairline">
            <Link href="/account" className="py-3 border-b hairline text-[1.35rem] uppercase tracking-[0.1em]">Resumen</Link>
            <Link href="/account/orders" className="py-3 border-b hairline text-[1.35rem] uppercase tracking-[0.1em]">Pedidos</Link>
            <Link href="/account/addresses" className="py-3 border-b hairline text-[1.35rem] uppercase tracking-[0.1em]">Direcciones</Link>
            <Link href="/account/profile" className="py-3 border-b hairline text-[1.35rem] uppercase tracking-[0.1em]">Perfil</Link>
            <Link href="/account/password" className="py-3 border-b hairline text-[1.35rem] uppercase tracking-[0.1em]">Contraseña</Link>
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-6">
            <button type="submit" className="text-[1.3rem] uppercase tracking-[0.12em] underline text-muted">
              Cerrar sesión
            </button>
          </form>
        </aside>
        <div>{children}</div>
      </div>
    </section>
  );
}
