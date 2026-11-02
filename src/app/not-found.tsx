import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-width py-24 text-center">
      <p className="text-[6rem] leading-none">404</p>
      <h1 className="title-section mt-2">Página no encontrada</h1>
      <p className="text-[1.45rem] text-muted mt-4 mb-8">
        La página que buscas no existe o ha cambiado de dirección.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="button">Ir al inicio</Link>
        <Link href="/shop" className="button button--secondary">Ver catálogo</Link>
      </div>
    </section>
  );
}
