"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-context";
import { CartDrawer } from "./cart-drawer";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "Sobre REBELYN" },
  { href: "/shipping", label: "Envíos" },
  { href: "/size-guide", label: "Tallas" },
  { href: "/contact", label: "Contacto" },
];

const ANNOUNCEMENTS = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  text: BRAND.announcement,
}));

export function Header() {
  const { count, openDrawer } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <Marquee />
      <div className="sticky top-0 z-40 bg-paper">
        <header className="page-width grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2 md:py-3">
          <div className="justify-self-start flex items-center gap-4">
            <button
              type="button"
              className="md:hidden -ml-2 p-2"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
            >
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
                <path d="M0 1h22M0 8h22M0 15h22" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <nav className="hidden md:flex items-center gap-6" aria-label="Navegación principal">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[1.3rem] uppercase tracking-[0.12em] hover:text-magenta transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link href="/" className="justify-self-center" aria-label="REBELYN · Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoGif} alt="REBELYN" width={180} height={71} loading="eager" decoding="async" className="h-[2.6rem] w-auto md:h-[3.2rem]" />
          </Link>

          <div className="justify-self-end flex items-center gap-4 md:gap-5">
            <a href={BRAND.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hidden md:block hover:text-magenta">
              <IconInstagram />
            </a>
            <a href={BRAND.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hidden md:block hover:text-magenta">
              <IconTikTok />
            </a>
            <button type="button" aria-label="Buscar" onClick={() => setSearchOpen((v) => !v)} className="hover:text-magenta">
              <IconSearch />
            </button>
            <Link href="/account" aria-label="Cuenta" className="hover:text-magenta">
              <IconAccount />
            </Link>
            <button type="button" aria-label={`Carrito (${count})`} onClick={openDrawer} className="relative hover:text-magenta">
              <IconBag />
              <span
                className={`absolute -top-2 -right-2 min-w-[1.8rem] h-[1.8rem] px-1 rounded-full text-[1.1rem] leading-[1.8rem] text-center ${
                  count === 0 ? "bg-ink text-paper" : "bg-volt text-ink font-bold"
                }`}
              >
                {count}
              </span>
            </button>
          </div>
        </header>

        {searchOpen && (
          <div className="border-t hairline bg-paper">
            <SearchPanel onClose={() => setSearchOpen(false)} />
          </div>
        )}
      </div>

      <CartDrawer />

      {menuOpen && (
        <div className="drawer" data-open="true" role="dialog" aria-modal="true" aria-label="Menú">
          <button className="drawer__backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
          <div className="drawer__panel drawer__panel--left p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[1.4rem] uppercase tracking-[0.2em]">Menú</span>
              <button type="button" aria-label="Cerrar" onClick={() => setMenuOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
            </div>
            <nav className="flex flex-col gap-5">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-[1.6rem] uppercase tracking-[0.12em]" onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-10 flex flex-col gap-4 border-t hairline pt-6">
              <Link href="/account" className="text-[1.4rem] uppercase tracking-[0.12em]" onClick={() => setMenuOpen(false)}>
                Mi cuenta
              </Link>
              <div className="flex gap-5">
                <a href={BRAND.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInstagram /></a>
                <a href={BRAND.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><IconTikTok /></a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ name: string; slug: string; image: string | null; priceCents: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setResults(data.items ?? []);
        }
      } catch {
        /* cancelado */
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
    onClose();
  }

  return (
    <div className="page-width py-4">
      <form onSubmit={submit} className="flex gap-2" role="search">
        <input
          ref={inputRef}
          className="field"
          type="search"
          placeholder="Buscar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar productos"
        />
        <button className="button" type="submit">Buscar</button>
      </form>
      {results.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {results.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/product/${item.slug}`}
                onClick={onClose}
                className="flex items-center gap-4 p-2 hover:bg-wash transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.image && <img src={item.image} alt="" width={48} height={64} className="w-12 h-16 object-cover" />}
                <span className="flex-1 text-[1.4rem]">{item.name}</span>
                <span className="text-[1.3rem] text-muted">{formatMoney(item.priceCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 text-[1.3rem] text-muted">Sin resultados para “{q}”.</p>
      )}
    </div>
  );
}

function Marquee() {
  return (
    <div className="running-text" aria-hidden="true">
      <div className="running-text__track" style={{ ["--duracion" as string]: "28s" }}>
        {[0, 1].map((g) => (
          <div key={g} className="running-text__group">
            {ANNOUNCEMENTS.map((item) => (
              <span key={item.id}>
                {item.text}
                <span className="tick" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.2 1.7 1.2 3.1 2.9 3.9.7.3 1.5.5 2.3.5v3c-1.6 0-3-.4-4.3-1.2v5.7c0 3.3-2.5 5.9-5.8 5.9-3.2 0-5.8-2.6-5.8-5.8 0-3.3 2.7-5.9 6-5.8v3.1c-.3-.1-.7-.2-1-.2-1.7 0-3 1.3-3 2.9s1.3 3 3 3c1.7 0 2.9-1.4 2.9-3.1V3h2.8Z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="9.5" cy="9.5" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.5 14.5L20 20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg width="18" height="19" viewBox="0 0 18 19" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="9" cy="6" r="3.5" />
      <path d="M2 18c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="20" height="24" viewBox="0 0 51 62" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M6 20h39l-4 34a5 5 0 0 1-5 4.5H15A5 5 0 0 1 10 54L6 20Z" />
      <path d="M18 26V13a7.5 7.5 0 0 1 15 0v13" />
    </svg>
  );
}
