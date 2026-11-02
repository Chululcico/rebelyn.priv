import "server-only";

/**
 * Interfaz modular de proveedores de pago.
 * Para añadir PayPal, Bizum u otro: implementar `PaymentProvider` y
 * registrarlo en `src/lib/payments/index.ts`. El checkout no cambia.
 */

export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: string;
  email: string;
  description?: string;
};

export type CreatePaymentResult = {
  /** Client secret de Stripe para confirmar desde el frontend (Payment Element). */
  clientSecret: string;
  /** Clave pública para montar el elemento. */
  publishableKey: string;
  paymentId: string;
};

export type RefundInput = {
  paymentIntentId: string;
  amountCents?: number;
  reason?: string;
};

export type RefundResult = { ok: boolean; refundId?: string; error?: string };

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  isConfigured(): boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}
