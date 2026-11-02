/** Limitador de intentos en memoria. Suficiente para una instancia; a escala
 *  sustituir por Redis/Upstash sin tocar los call sites (misma interfaz). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Limpieza periódica para no acumular claves muertas. */
if (globalThis.__rateLimitSweep !== true) {
  globalThis.__rateLimitSweep = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, 60_000).unref?.();
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitSweep: boolean | undefined;
}
