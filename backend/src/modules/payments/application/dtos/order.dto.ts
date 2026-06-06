import { OrderStatus } from '../../domain/value-objects/order-status.vo';
import { PaymentMethod } from '../../domain/value-objects/payment-method.vo';

// ============================================
// Order DTOs
// ============================================

export interface OrderItemDto {
  readonly id: string;
  readonly ticketTypeId: string;
  readonly ticketTypeName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

export interface OrderDto {
  readonly id: string;
  readonly userId: string;
  readonly eventId: string;
  readonly status: OrderStatus;
  readonly items: OrderItemDto[];
  readonly subtotal: number;
  readonly platformFee: number;
  readonly paymentFees: number;
  readonly total: number;
  readonly currency: string;
  readonly paymentMethod: PaymentMethod | null;
  readonly transactionId: string | null;
  readonly paidAt: Date | null;
  readonly refundedAt: Date | null;
  readonly refundReason: string | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PaginatedOrdersDto {
  readonly data: OrderDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}
