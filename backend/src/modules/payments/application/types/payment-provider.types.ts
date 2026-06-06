/**
 * Payment Provider Types
 *
 * DTOs and result types used by payment provider ports.
 */

import { Money } from '@shared/domain/value-objects/money.vo';

import { OrderEntity } from '../../domain/entities/order.entity';

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
