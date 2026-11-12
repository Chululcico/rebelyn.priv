import type { Metadata, Viewport } from "next";
import { Dancing_Script } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

// Tipografía manuscrita para acentos concretos (no para todo el texto).
// next/font la descarga en build y la sirve desde el propio dominio.
const scriptFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000"),
  title: {
    default: `${BRAND.name} · ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.name}: ropa que rompe con lo común. Combina comodidad y estilo cada día.`,
  icons: { icon: BRAND.favicon, apple: BRAND.favicon },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: BRAND.name,
    description: `${BRAND.tagline}. Ropa moderna, urbana y minimalista.`,
    images: [{ url: BRAND.logoPng, width: 800, height: 800, alt: BRAND.name }],
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.tagline,
    images: [BRAND.logoPng],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={scriptFont.variable}>
      <head>
        {/* Las imágenes de producto se alojan en postimg: adelantar la conexión
            ahorra cientos de ms en la primera carga. */}
        <link rel="preconnect" href="https://i.postimg.cc" crossOrigin="" />
        <link rel="dns-prefetch" href="https://i.postimg.cc" />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
