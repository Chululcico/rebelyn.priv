import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = withApi(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
