import "server-only";
import { env } from "@/lib/env";

/**
 * URL pública de la tienda deducida de la PETICIÓN REAL.
 *
 * Prioriza el host por el que navega el cliente (que por definición sirve
 * esta aplicación) sobre NEXT_PUBLIC_SITE_URL: esa variable puede apuntar a
 * un dominio antiguo o no estar configurada, y en tal caso los enlaces de
 * retorno de pago y los webhooks romperían (404 en otra web).
 *
 * En desarrollo (localhost) cae a la variable configurada o localhost:3000.
 */
export function resolveBaseUrl(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host && !/^localhost(:\d+)?$/.test(host) && !host.startsWith("127.")) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  const configured = env.storeUrl.replace(/\/+$/, "");
  if (configured.startsWith("http")) return configured;
  return "http://localhost:3000";
}
