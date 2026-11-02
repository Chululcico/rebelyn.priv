import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";

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
    <html lang="es">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
