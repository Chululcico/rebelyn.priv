import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Registro de acciones administrativas (quién hizo qué y cuándo). */
export async function audit(params: {
  adminUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}): Promise<void> {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db.auditLog.create({
    data: {
      adminUserId: params.adminUserId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      before: params.before,
      after: params.after,
      ip,
    },
  });
}
