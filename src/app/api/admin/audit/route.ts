import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withApi(async (request: Request) => {
  await requireAdmin("SUPER_ADMIN");
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 50;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { adminUser: { select: { email: true } } },
    }),
    db.auditLog.count(),
  ]);

  return NextResponse.json({ logs, total, page, perPage });
});
