import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Verificación de origen para mutaciones (defensa CSRF junto a SameSite=Lax).
 * Se llama en todas las rutas POST/PATCH/PUT/DELETE del API.
 */
export async function assertSameOrigin(): Promise<void> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");
  if (!origin) return; // peticiones same-origin sin Origin (curl, apps nativas)

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new CsrfError("Origen no válido");
  }

  const allowed = new Set([host, new URL(env.storeUrl).host]);
  if (!allowed.has(originHost)) throw new CsrfError("Origen no permitido");
}

export class CsrfError extends Error {
  status = 403;
  constructor(message = "Petición bloqueada por seguridad") {
    super(message);
  }
}
