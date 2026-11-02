import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { addressSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi<Ctx>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = addressSchema.partial().parse(await readJson(request));

  const existing = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });

  if (input.isDefault) await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });

  const address = await db.address.update({ where: { id }, data: input });
  return NextResponse.json({ address });
});

export const DELETE = withApi<Ctx>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await db.address.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
});
