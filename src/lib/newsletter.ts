import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Tokens de baja para la newsletter.
 *
 * El enlace de "Darme de baja" lleva el email y una firma HMAC calculada con
 * SESSION_SECRET. Así nadie puede dar de baja a otra persona cambiando el
 * email en la URL: sin la firma correcta, el enlace no vale.
 */

function secret(): string {
  return env.sessionSecret || "rebelyn-newsletter-dev";
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("base64url");
}

export function isValidUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email));
  const received = Buffer.from(token || "");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

/** URL absoluta de baja que se incluye al pie de cada email. */
export function unsubscribeUrl(baseUrl: string, email: string): string {
  const url = new URL("/api/newsletter/unsubscribe", baseUrl.replace(/\/+$/, ""));
  url.searchParams.set("e", email.trim().toLowerCase());
  url.searchParams.set("t", unsubscribeToken(email));
  return url.toString();
}
