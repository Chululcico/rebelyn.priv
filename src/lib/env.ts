// Acceso tipado a las variables de entorno.
// Evitamos lanzar errores en la carga del módulo (rompe rutas/serverless con 500 HTML).
// Si falta algo crítico, fallará cuando se use, y las rutas API pueden capturarlo.

function read(name: string): string {
  return process.env[name] || "";
}

function warnIfMissing(name: string) {
  if (process.env.NODE_ENV === "production" && !process.env[name]) {
    console.error(`[env] Falta la variable de entorno: ${name}`);
  }
}

warnIfMissing("DATABASE_URL");
warnIfMissing("SESSION_SECRET");

export const env = {
  databaseUrl: read("DATABASE_URL"),
  sessionSecret: read("SESSION_SECRET"),
  storeUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000",
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || "REBELYN",
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "REBELYN <hola@rebelyn.net>",
  sumupApiKey: process.env.SUMUP_API_KEY || "",
  sumupMerchantCode: process.env.SUMUP_MERCHANT_CODE || "",
  sumupWebhookSecret: process.env.SUMUP_WEBHOOK_SECRET || "",
  isProd: process.env.NODE_ENV === "production",
};

export const sumupConfigured = () => Boolean(env.sumupApiKey && env.sumupMerchantCode);
