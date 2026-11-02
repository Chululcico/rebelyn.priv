import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withApi(async (request: Request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 10;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { items: { take: 3 } },
    }),
    db.order.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ orders, total, page, perPage });
});
