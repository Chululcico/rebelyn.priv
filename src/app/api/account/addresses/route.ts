import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { addressSchema } from "@/lib/validate";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = withApi(async () => {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ addresses });
});

export const POST = withApi(async (request: Request) => {
  const user = await requireUser();
  const input = addressSchema.parse(await readJson(request));

  const count = await db.address.count({ where: { userId: user.id } });
  const isDefault = input.isDefault || count === 0;

  if (isDefault) await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });

  const address = await db.address.create({
    data: { ...input, phone: input.phone || null, line2: input.line2 || null, isDefault, userId: user.id },
  });
  return NextResponse.json({ address }, { status: 201 });
});
