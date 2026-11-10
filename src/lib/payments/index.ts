import "server-only";
import type { PaymentProvider } from "./types";
import { sumupProvider } from "./sumup-provider";

const providers: PaymentProvider[] = [sumupProvider];

export function getPaymentProvider(id = "sumup"): PaymentProvider | null {
  const provider = providers.find((p) => p.id === id) ?? providers.find((p) => p.isConfigured());
  if (!provider || !provider.isConfigured()) return null;
  return provider;
}

export function listConfiguredProviders(): { id: string; displayName: string }[] {
  return providers.filter((p) => p.isConfigured()).map((p) => ({ id: p.id, displayName: p.displayName }));
}

/**
 * Métodos de pago visibles al cliente en el checkout.
 * Solo se listan los proveedores configurados (API keys presentes).
 * `logos` son ids que el frontend mapea a SVGs locales (sin assets externos).
 */
export type PublicPaymentMethod = {
  id: string;
  label: string;
  description: string;
  logos: string[];
};

export function publicPaymentMethods(): PublicPaymentMethod[] {
  const methods: PublicPaymentMethod[] = [];

  if (sumupProvider.isConfigured()) {
    methods.push({
      id: "sumup",
      label: "Tarjeta de crédito o débito",
      description:
        "Pago seguro con tarjeta (Visa, Mastercard, Maestro, American Express) gestionado por SumUp. " +
        "Si tu dispositivo lo permite, también podrás usar Apple Pay o Google Pay en la página de pago.",
      logos: ["visa", "mastercard", "maestro", "amex"],
    });
  }

  return methods;
}

export type { PaymentProvider, CreatePaymentInput, CreatePaymentResult, RefundInput, RefundResult } from "./types";
