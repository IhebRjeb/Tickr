import { Injectable } from '@nestjs/common';

import { OrderEntity } from '../../../domain/entities/order.entity';
import { OrderItemEntity } from '../../../domain/entities/order-item.entity';
import { OrderStatus } from '../../../domain/value-objects/order-status.vo';
import { PaymentMethod } from '../../../domain/value-objects/payment-method.vo';
import { OrderOrmEntity } from '../entities/order.orm-entity';
import { OrderItemOrmEntity } from '../entities/order-item.orm-entity';

/**
 * Order Mapper
 *
 * Transforms between domain entities (OrderEntity) and
 * persistence entities (OrderOrmEntity).
 *
 * Handles nested OrderItem conversions.
 */
@Injectable()
export class OrderMapper {
  /**
   * Convert domain entity to persistence entity
   */
  toPersistence(domain: OrderEntity): OrderOrmEntity {
    const entity = new OrderOrmEntity();

    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.eventId = domain.eventId;
    entity.status = domain.status;
    entity.paymentMethod = domain.paymentMethod;
    entity.paymentGatewayOrderId = domain.paymentGatewayOrderId;
    entity.paymentIntentId = domain.paymentIntentId;
    entity.gatewayPaymentRef = domain.gatewayPaymentRef;
    entity.transactionId = domain.transactionId;
    entity.subtotalAmount = domain.subtotalAmount;
    entity.platformFeeAmount = domain.platformFeeAmount;
    entity.paymentFeesAmount = domain.paymentFeesAmount;
    entity.totalAmount = domain.totalAmount;
    entity.currency = domain.currency;
    entity.paidAt = domain.paidAt;
    entity.refundedAt = domain.refundedAt;
    entity.refundReason = domain.refundReason;
    entity.expiresAt = domain.expiresAt;
    entity.metadata = domain.metadata;
    entity.statusHistory = domain.statusHistory.map((entry) => ({
      status: entry.status,
      timestamp: entry.timestamp.toISOString(),
      reason: entry.reason,
    }));
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;

    // Map items
    entity.items = domain.items.map((item) => this.itemToPersistence(item, domain.id));

    return entity;
  }

  /**
   * Convert persistence entity to domain entity
   */
  toDomain(raw: OrderOrmEntity): OrderEntity {
    const items = raw.items
      ? raw.items.map((item) => this.itemToDomain(item))
      : [];

    return OrderEntity.reconstitute({
      id: raw.id,
      userId: raw.userId,
      eventId: raw.eventId,
      items,
      status: raw.status as OrderStatus,
      subtotalAmount: Number(raw.subtotalAmount),
      platformFeeAmount: Number(raw.platformFeeAmount),
      paymentFeesAmount: Number(raw.paymentFeesAmount),
      totalAmount: Number(raw.totalAmount),
      currency: raw.currency,
      paymentMethod: raw.paymentMethod as PaymentMethod | null,
      paymentGatewayOrderId: raw.paymentGatewayOrderId,
      paymentIntentId: raw.paymentIntentId,
      gatewayPaymentRef: raw.gatewayPaymentRef,
      transactionId: raw.transactionId,
      paidAt: raw.paidAt,
      refundedAt: raw.refundedAt,
      refundReason: raw.refundReason,
      expiresAt: raw.expiresAt,
      metadata: raw.metadata,
      statusHistory: (raw.statusHistory || []).map((entry) => ({
        status: entry.status as OrderStatus,
        timestamp: new Date(entry.timestamp),
        reason: entry.reason,
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convert array of persistence entities to domain entities
   */
  toDomainArray(raws: OrderOrmEntity[]): OrderEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }

  /**
   * Update existing ORM entity with domain entity data
   */
  updatePersistence(target: OrderOrmEntity, source: OrderEntity): OrderOrmEntity {
    target.status = source.status;
    target.paymentMethod = source.paymentMethod;
    target.paymentGatewayOrderId = source.paymentGatewayOrderId;
    target.paymentIntentId = source.paymentIntentId;
    target.gatewayPaymentRef = source.gatewayPaymentRef;
    target.transactionId = source.transactionId;
    target.subtotalAmount = source.subtotalAmount;
    target.platformFeeAmount = source.platformFeeAmount;
    target.paymentFeesAmount = source.paymentFeesAmount;
    target.totalAmount = source.totalAmount;
    target.paidAt = source.paidAt;
    target.refundedAt = source.refundedAt;
    target.refundReason = source.refundReason;
    target.metadata = source.metadata;
    target.statusHistory = source.statusHistory.map((entry) => ({
      status: entry.status,
      timestamp: entry.timestamp.toISOString(),
      reason: entry.reason,
    }));
    target.updatedAt = source.updatedAt;

    // Update items
    target.items = source.items.map((item) => this.itemToPersistence(item, source.id));

    return target;
  }

  // ============================================
  // Private: OrderItem Mapping
  // ============================================

  private itemToPersistence(domain: OrderItemEntity, orderId: string): OrderItemOrmEntity {
    const entity = new OrderItemOrmEntity();

    entity.id = domain.id;
    entity.orderId = orderId;
    entity.ticketTypeId = domain.ticketTypeId;
    entity.ticketTypeName = domain.ticketTypeName;
    entity.priceAmount = domain.priceAmount;
    entity.priceCurrency = domain.priceCurrency;
    entity.quantity = domain.quantity;
    entity.createdAt = domain.createdAt;

    return entity;
  }

  private itemToDomain(raw: OrderItemOrmEntity): OrderItemEntity {
    return OrderItemEntity.reconstitute({
      id: raw.id,
      ticketTypeId: raw.ticketTypeId,
      ticketTypeName: raw.ticketTypeName,
      priceAmount: Number(raw.priceAmount),
      priceCurrency: raw.priceCurrency,
      quantity: raw.quantity,
      createdAt: raw.createdAt,
    });
  }
}
