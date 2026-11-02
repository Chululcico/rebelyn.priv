import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withApi(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 20;

  const where = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] }
    : { role: "CUSTOMER" as const };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      // Nunca se devuelven hashes ni contraseñas.
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true, _count: { select: { orders: true } } },
    }),
    db.user.count({ where }),
  ]);

  const ids = users.map((u) => u.id);
  const spendAgg = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: ids }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
    _sum: { totalCents: true },
  });
  const spend = new Map(spendAgg.map((s) => [s.userId, s._sum.totalCents ?? 0]));

  return NextResponse.json({
    customers: users.map((u) => ({ ...u, totalSpentCents: spend.get(u.id) ?? 0 })),
    total,
    page,
    perPage,
  });
});
