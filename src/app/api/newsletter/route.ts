import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api";
import { newsletterSchema } from "@/lib/validate";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const POST = withApi(
  async (request: Request) => {
    const { email } = newsletterSchema.parse(await readJson(request));
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: { active: true },
    });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { limit: 5, windowMs: 60 * 60 * 1000, key: "newsletter" } },
);
