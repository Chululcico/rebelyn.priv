import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { searchProducts } from "@/lib/catalog";

export const runtime = "nodejs";

export const GET = withApi(
  async (request: Request) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const items = await searchProducts(q, 6);
    return NextResponse.json({
      items: items.map((p) => ({ name: p.name, slug: p.slug, image: p.image, priceCents: p.priceCents })),
    });
  },
  { csrf: false, rateLimit: { limit: 60, windowMs: 60 * 1000, key: "search" } },
);
