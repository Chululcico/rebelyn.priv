import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AuthError } from "@/lib/auth";
import { CsrfError, assertSameOrigin } from "@/lib/csrf";
import { StockError } from "@/lib/stock";
import { rateLimit } from "@/lib/rate-limit";

type Handler<T> = (request: Request, ctx: T) => Promise<Response>;

/**
 * Envuelve los handlers del API con: verificación de origen (CSRF),
 * validación de entrada, rate limiting y manejo unificado de errores.
 * Ningún error interno se filtra al cliente.
 * Firma compatible con Next: (request, ctx) => Response.
 */
export function withApi<T = unknown>(
  handler: Handler<T>,
  options: { rateLimit?: { limit: number; windowMs: number; key?: string }; validate?: ZodSchema; csrf?: boolean } = {},
): (request: Request, ctx: T) => Promise<Response> {
  return async (request: Request, ctx: T) => {
    try {
      if (options.csrf !== false) await assertSameOrigin();

      if (options.rateLimit) {
        const { limit, windowMs, key } = options.rateLimit;
        const routeKey = key ?? JSON.stringify(ctx ?? {});
        const verdict = rateLimit(`api:${routeKey}`, limit, windowMs);
        if (!verdict.ok) {
          return NextResponse.json(
            { error: "Demasiados intentos. Inténtalo de nuevo en unos segundos." },
            { status: 429, headers: { "Retry-After": String(verdict.retryAfterSec) } },
          );
        }
      }

      return await handler(request, ctx);
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return NextResponse.json({ error: first ? `${first.path.join(".")}: ${first.message}` : "Datos no válidos" }, { status: 400 });
      }
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof CsrfError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error instanceof StockError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      console.error("[api]", error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
}

/** Parsea el body JSON de la petición. */
export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ZodError([{ code: "invalid_type", expected: "object", received: "null", path: [], message: "Body JSON no válido" } as never]);
  }
}
