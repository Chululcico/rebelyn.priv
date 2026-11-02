import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withApi(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 20;

  const [messages, total] = await Promise.all([
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
    db.contactMessage.count(),
  ]);

  return NextResponse.json({ messages, total, page, perPage });
});

export const PATCH = withApi(async (request: Request) => {
  await requireAdmin();
  const body = (await request.json().catch(() => ({}))) as { id?: string; read?: boolean };
  if (!body.id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  await db.contactMessage.update({ where: { id: body.id }, data: { read: body.read ?? true } });
  return NextResponse.json({ ok: true });
});
