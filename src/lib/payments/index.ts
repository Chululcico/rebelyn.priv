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
 * Cada método aparece por separado con su logo; todos se procesan en la
 * página segura de SumUp, que ofrece cada uno según el dispositivo.
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
    methods.push(
      {
        id: "visa",
        label: "Visa",
        description: "Tarjeta de crédito o débito. Introducirás los datos en la página segura de SumUp.",
        logos: ["visa"],
      },
      {
        id: "mastercard",
        label: "Mastercard",
        description: "Tarjeta de crédito o débito. Introducirás los datos en la página segura de SumUp.",
        logos: ["mastercard"],
      },
      {
        id: "maestro",
        label: "Maestro",
        description: "Tarjeta de débito. Introducirás los datos en la página segura de SumUp.",
        logos: ["maestro"],
      },
      {
        id: "amex",
        label: "American Express",
        description: "Tarjeta de crédito. Introducirás los datos en la página segura de SumUp.",
        logos: ["amex"],
      },
      {
        id: "applepay",
        label: "Apple Pay",
        description: "Pago al instante con Face ID o Touch ID (iPhone, iPad o Mac).",
        logos: ["applepay"],
      },
      {
        id: "googlepay",
        label: "Google Pay",
        description: "Pago al instante con la tarjeta guardada en tu cuenta de Google.",
        logos: ["googlepay"],
      },
    );
  }

  return methods;
}

export type { PaymentProvider, CreatePaymentInput, CreatePaymentResult, RefundInput, RefundResult } from "./types";
