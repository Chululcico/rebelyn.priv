// Acceso tipado a las variables de entorno. Falla en arranque si falta una
// obligatoria en producción, y avisa en desarrollo.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
    }
    return "";
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
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
