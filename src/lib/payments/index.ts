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

export type { PaymentProvider, CreatePaymentInput, CreatePaymentResult, RefundInput, RefundResult } from "./types";
