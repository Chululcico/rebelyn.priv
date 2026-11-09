import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function envCheck(name: string) {
  const v = process.env[name];
  return { present: !!v, length: v?.length ?? 0 };
}

export async function GET() {
  const steps: Record<string, unknown> = {};

  steps.env = {
    DATABASE_URL: envCheck("DATABASE_URL"),
    DIRECT_URL: envCheck("DIRECT_URL"),
    SESSION_SECRET: envCheck("SESSION_SECRET"),
    FIREBASE_PROJECT_ID: envCheck("FIREBASE_PROJECT_ID"),
    FIREBASE_CLIENT_EMAIL: envCheck("FIREBASE_CLIENT_EMAIL"),
    FIREBASE_PRIVATE_KEY: envCheck("FIREBASE_PRIVATE_KEY"),
    NEXT_PUBLIC_FIREBASE_API_KEY: envCheck("NEXT_PUBLIC_FIREBASE_API_KEY"),
  };

  // Check private key format hints (no secret leaked)
  const pk = process.env.FIREBASE_PRIVATE_KEY || "";
  steps.firebasePrivateKeyHints = {
    hasBegin: pk.includes("BEGIN PRIVATE KEY"),
    hasEnd: pk.includes("END PRIVATE KEY"),
    hasEscapedNewlines: pk.includes("\\n"),
    hasRealNewlines: pk.includes("\n"),
  };

  try {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    steps.firebaseAdmin = { ok: true, hasAuth: !!auth };
  } catch (e) {
    steps.firebaseAdmin = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5).join("\n") : undefined,
    };
  }

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    steps.database = { ok: true };
  } catch (e) {
    steps.database = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5).join("\n") : undefined,
    };
  }

  return NextResponse.json({ ok: true, steps }, { status: 200 });
}
