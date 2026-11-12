import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withApi(async () => {
  await requireAdmin();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidWhere = { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as ("PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED")[] } };

  const [
    todayOrders,
    weekOrders,
    monthOrders,
    pendingOrders,
    shippedOrders,
    totalProducts,
    lowStock,
    topProducts,
    recentOrders,
    customerCount,
    activeNow,
  ] = await Promise.all([
    db.order.aggregate({ where: { ...paidWhere, paidAt: { gte: startOfDay } }, _sum: { totalCents: true }, _count: true }),
    db.order.aggregate({ where: { ...paidWhere, paidAt: { gte: startOfWeek } }, _sum: { totalCents: true }, _count: true }),
    db.order.aggregate({ where: { ...paidWhere, paidAt: { gte: startOfMonth } }, _sum: { totalCents: true }, _count: true }),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "SHIPPED" } }),
    db.product.count({ where: { status: { not: "ARCHIVED" } } }),
    db.$queryRaw<{ name: string; size: string; color: string | null; stock: number }[]>`
      SELECT p."name", v."size", c."name" AS color, v."stock"
      FROM "ProductVariant" v
      JOIN "Product" p ON p."id" = v."productId"
      LEFT JOIN "Color" c ON c."id" = v."colorId"
      WHERE v."stock" <= 5 AND p."status" = 'ACTIVE'
      ORDER BY v."stock" ASC
      LIMIT 20`,
    db.$queryRaw<{ name: string; slug: string; units: number; revenue: number }[]>`
      SELECT p."name", p."slug", SUM(oi."qty") AS units, SUM(oi."totalCents") AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      LEFT JOIN "Product" p ON p."slug" = oi."productSlug"
      WHERE o."status" IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
      GROUP BY p."name", p."slug"
      ORDER BY units DESC
      LIMIT 10`,
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: { take: 2 } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.presence.count({ where: { lastSeen: { gte: new Date(Date.now() - 3 * 60 * 1000) } } }),
  ]);

  return NextResponse.json({
    sales: {
      todayCents: todayOrders._sum?.totalCents ?? 0,
      todayCount: todayOrders._count,
      weekCents: weekOrders._sum?.totalCents ?? 0,
      weekCount: weekOrders._count,
      monthCents: monthOrders._sum?.totalCents ?? 0,
      monthCount: monthOrders._count,
    },
    orders: { pending: pendingOrders, shipped: shippedOrders },
    products: { total: totalProducts, lowStock: lowStock.map((r) => ({ name: r.name, size: r.size, color: r.color, stock: Number(r.stock) })) },
    topProducts: topProducts.map((p) => ({ name: p.name, slug: p.slug, units: Number(p.units), revenue: Number(p.revenue) })),
    recentOrders,
    customers: customerCount,
    online: activeNow,
  });
});
