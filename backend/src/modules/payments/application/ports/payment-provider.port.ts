import { Money } from '@shared/domain/value-objects/money.vo';

import { OrderEntity } from '../../domain/entities/order.entity';
import { PaymentMethod } from '../../domain/value-objects/payment-method.vo';

// ============================================
// Payment Provider Port (Gateway Abstraction)
// ============================================

export const PAYMENT_PROVIDER_FACTORY = Symbol('PAYMENT_PROVIDER_FACTORY');

/**
 * Result of initiating a payment with a gateway
 */
export interface PaymentIntent {
  id: string;
  paymentUrl?: string;
  clientSecret?: string;
  status: string;
}

/**
 * Result of confirming a payment
 */
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
}

/**
 * Result of a refund operation
 */
export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
}

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
