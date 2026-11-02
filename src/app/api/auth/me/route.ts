import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}, { csrf: false });
