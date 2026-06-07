import { Money } from '@shared/domain/value-objects/money.vo';

import { OrderEntity } from '../../domain/entities/order.entity';
import { PaymentMethod } from '../../domain/value-objects/payment-method.vo';
import type { PaymentIntent, PaymentResult, RefundResult } from '../types/payment-provider.types';

// ============================================
// Payment Provider Port (Gateway Abstraction)
// ============================================

export const PAYMENT_PROVIDER_FACTORY = Symbol('PAYMENT_PROVIDER_FACTORY');

// Re-export types for convenience
export type { PaymentIntent, PaymentResult, RefundResult } from '../types/payment-provider.types';

/**
 * Payment Provider Interface
 *
 * Implemented by each gateway adapter (Stripe, Konnect, Paymee).
 * Domain/application layer depends only on this interface.
 */
export interface PaymentProviderPort {
  createPaymentIntent(order: OrderEntity): Promise<PaymentIntent>;
  confirmPayment(referenceId: string): Promise<PaymentResult>;
  refund(paymentRef: string, amount: Money): Promise<RefundResult>;
  verifyWebhook(signature: string, body: unknown): boolean;
}

/**
 * Factory interface for getting the correct provider by payment method
 */
export interface PaymentProviderFactoryPort {
  getProvider(method: PaymentMethod): PaymentProviderPort;
  getSupportedMethods(): PaymentMethod[];
}
