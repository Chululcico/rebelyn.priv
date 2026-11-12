import { db } from "@/lib/db";
import { isValidUnsubscribeToken } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · REBELYN</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
         background: #ffffff; color: #202020; font-family: Helvetica, Arial, sans-serif; }
  .card { width: 100%; max-width: 520px; border: 1px solid #e4e4e4; padding: 40px 32px; text-align: center; }
  .logo { font-size: 26px; letter-spacing: 8px; font-weight: 700; border-bottom: 1px solid #202020; padding-bottom: 18px; margin-bottom: 28px; }
  h1 { font-size: 20px; letter-spacing: 1px; margin: 0 0 16px; text-transform: uppercase; }
  p { font-size: 14px; line-height: 1.65; margin: 0 0 14px; color: #444; }
  strong { color: #121212; }
  button { display: inline-block; margin: 12px 0 4px; padding: 13px 28px; border: 0; border-radius: 4px;
           background: #121212; color: #ffffff; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; }
  button:hover { background: #333333; }
  a { color: #121212; font-size: 13px; }
  .muted { color: #6b6b6b; font-size: 12px; margin-top: 22px; }
</style>
</head>
<body>
  <main class="card">
    <div class="logo">REBELYN</div>
    <h1>${escapeHtml(title)}</h1>
    ${body}
    <p class="muted">REBELYN · Rompe con lo común</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function readEmailAndToken(params: { get(name: string): unknown }) {
  const rawEmail = params.get("e");
  const rawToken = params.get("t");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const token = typeof rawToken === "string" ? rawToken : "";
  return { email, token };
}

export async function GET(request: Request) {
  const { email, token } = readEmailAndToken(new URL(request.url).searchParams);

  if (!email || !token || !isValidUnsubscribeToken(email, token)) {
    return page(
      "Enlace no válido",
      "<p>Este enlace de baja no es válido o ha caducado. Si quieres dejar de recibir nuestros correos, escríbenos y lo hacemos a mano.</p><p><a href=\"/\">Volver a la tienda</a></p>",
      400,
    );
  }

  const subscriber = await db.newsletterSubscriber.findUnique({ where: { email }, select: { active: true } });

  if (!subscriber) {
    return page("No encontramos tu suscripción", "<p>No tenemos ese email en la lista. Puede que ya estuviera dado de baja.</p><p><a href=\"/\">Volver a la tienda</a></p>");
  }

  if (!subscriber.active) {
    return page("Ya estabas dado de baja", "<p>Ese email ya no recibe la newsletter de REBELYN.</p><p><a href=\"/\">Volver a la tienda</a></p>");
  }

  return page(
    "¿Darte de baja?",
    `<p>Vas a dejar de recibir la newsletter de REBELYN en <strong>${escapeHtml(email)}</strong>.</p>
    <form method="post" action="/api/newsletter/unsubscribe">
      <input type="hidden" name="e" value="${escapeHtml(email)}">
      <input type="hidden" name="t" value="${escapeHtml(token)}">
      <button type="submit">Sí, darme de baja</button>
    </form>
    <p class="muted">Si has pulsado el enlace sin querer, cierra esta página y no cambia nada.</p>`,
  );
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return page("No se pudo procesar la baja", "<p>Inténtalo de nuevo desde el enlace del correo.</p>", 400);

  const { email, token } = readEmailAndToken(form);

  if (!email || !token || !isValidUnsubscribeToken(email, token)) {
    return page("Enlace no válido", "<p>Este enlace de baja no es válido o ha caducado.</p>", 400);
  }

  await db.newsletterSubscriber.updateMany({ where: { email }, data: { active: false } });

  return page(
    "Te has dado de baja",
    "<p>Ya no recibirás más correos de la newsletter de REBELYN.</p><p>Si cambias de idea, puedes volver a suscribirte en el pie de la tienda.</p><p><a href=\"/\">Volver a la tienda</a></p>",
  );
}
