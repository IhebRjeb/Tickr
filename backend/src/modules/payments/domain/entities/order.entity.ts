import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';
import { Money } from '@shared/domain/value-objects/money.vo';

import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderExpiredEvent } from '../events/order-expired.event';
import { OrderFailedEvent } from '../events/order-failed.event';
import { OrderPaidEvent } from '../events/order-paid.event';
import { OrderProcessingEvent } from '../events/order-processing.event';
import { OrderRefundedEvent } from '../events/order-refunded.event';
import { InvalidOrderException } from '../exceptions/invalid-order.exception';
import { InvalidOrderStatusException } from '../exceptions/invalid-order-status.exception';
import { MaxItemsExceededException } from '../exceptions/max-items-exceeded.exception';
import { OrderExpiredException } from '../exceptions/order-expired.exception';
import { OrderItemEntity, CreateOrderItemProps } from './order-item.entity';
import { isValidOrderTransition, OrderStatus } from '../value-objects/order-status.vo';
import { PaymentMethod } from '../value-objects/payment-method.vo';

// ============================================
// Internal Interfaces
// ============================================

export type OrderStatusHistoryEntry = {
  readonly status: OrderStatus;
  readonly timestamp: Date;
  readonly reason?: string;
};

export type CreateOrderProps = {
  userId: string;
  eventId: string;
  items: CreateOrderItemProps[];
  currency: string;
  commissionRate: number;
  expirationMinutes: number;
  metadata?: Record<string, unknown>;
};

export type OrderProps = {
  id: string;
  userId: string;
  eventId: string;
  items: OrderItemEntity[];
  status: OrderStatus;
  subtotalAmount: number;
  platformFeeAmount: number;
  paymentFeesAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  paymentGatewayOrderId: string | null;
  paymentIntentId: string | null;
  gatewayPaymentRef: string | null;
  transactionId: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  refundReason: string | null;
  expiresAt: Date;
  metadata: Record<string, unknown> | null;
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};

// ============================================
// Order Aggregate Root
// ============================================

/**
 * Order Aggregate Root
 *
 * The main aggregate for the Payments bounded context.
 * Manages the order lifecycle from creation through payment to completion.
 *
 * Lifecycle States:
 * - PENDING: Order created, waiting for payment (15 min TTL)
 * - PROCESSING: Payment initiated with gateway
 * - PAID: Payment confirmed, tickets activated
 * - FAILED: Payment failed (after max retries)
 * - CANCELLED: User cancelled or order expired
 * - REFUNDED: Payment refunded
 *
 * Business Rules:
 * - Maximum 10 items per order
 * - Order expires after configurable timeout (default 15 min)
 * - Platform commission calculated on subtotal
 * - Only valid state transitions allowed
 * - metadata must include holder info for TN gateways
 */
export class OrderEntity extends BaseEntity<OrderEntity> {
  // ============================================
  // Constants
  // ============================================

  static readonly MAX_ITEMS = 10;
  static readonly MIN_ITEMS = 1;

  // ============================================
  // Private Properties
  // ============================================

  private _userId: string;
  private _eventId: string;
  private _items: OrderItemEntity[];
  private _status: OrderStatus;
  private _subtotalAmount: number;
  private _platformFeeAmount: number;
  private _paymentFeesAmount: number;
  private _totalAmount: number;
  private _currency: string;
  private _paymentMethod: PaymentMethod | null;
  private _paymentGatewayOrderId: string | null;
  private _paymentIntentId: string | null;
  private _gatewayPaymentRef: string | null;
  private _transactionId: string | null;
  private _paidAt: Date | null;
  private _refundedAt: Date | null;
  private _refundReason: string | null;
  private _expiresAt: Date;
  private _metadata: Record<string, unknown> | null;
  private _statusHistory: OrderStatusHistoryEntry[];

  // ============================================
  // Constructor (Private)
  // ============================================

  private constructor(props: OrderProps) {
    super(props.id, props.createdAt);
    this._userId = props.userId;
    this._eventId = props.eventId;
    this._items = props.items;
    this._status = props.status;
    this._subtotalAmount = props.subtotalAmount;
    this._platformFeeAmount = props.platformFeeAmount;
    this._paymentFeesAmount = props.paymentFeesAmount;
    this._totalAmount = props.totalAmount;
    this._currency = props.currency;
    this._paymentMethod = props.paymentMethod;
    this._paymentGatewayOrderId = props.paymentGatewayOrderId;
    this._paymentIntentId = props.paymentIntentId;
    this._gatewayPaymentRef = props.gatewayPaymentRef;
    this._transactionId = props.transactionId;
    this._paidAt = props.paidAt;
    this._refundedAt = props.refundedAt;
    this._refundReason = props.refundReason;
    this._expiresAt = props.expiresAt;
    this._metadata = props.metadata;
    this._statusHistory = props.statusHistory || [{ status: props.status, timestamp: props.createdAt }];
    this._updatedAt = props.updatedAt;
  }

  // ============================================
  // Static Factories
  // ============================================

  /**
   * Create a new Order aggregate
   *
   * @param props - Order creation properties
   * @returns Result with the created order or validation error
   */
  static create(props: CreateOrderProps): Result<OrderEntity, InvalidOrderException> {
    // Validate userId
    if (!isUUID(props.userId)) {
      return Result.fail(InvalidOrderException.invalidUserId());
    }

    // Validate eventId
    if (!isUUID(props.eventId)) {
      return Result.fail(InvalidOrderException.invalidEventId());
    }

    // Validate items count
    if (props.items.length < OrderEntity.MIN_ITEMS) {
      return Result.fail(InvalidOrderException.noItems());
    }
    if (props.items.length > OrderEntity.MAX_ITEMS) {
      return Result.fail(InvalidOrderException.tooManyItems(OrderEntity.MAX_ITEMS));
    }

    // Create order items
    const items = props.items.map((item) => OrderItemEntity.create(item));

    // Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.lineTotal),
      Money.zero(props.currency),
    );

    const platformFee = subtotal.percentage(props.commissionRate);
    const total = subtotal.add(platformFee);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + props.expirationMinutes);

    const id = generateUUID();
    const now = new Date();

    const order = new OrderEntity({
      id,
      userId: props.userId,
      eventId: props.eventId,
      items,
      status: OrderStatus.PENDING,
      subtotalAmount: subtotal.amount,
      platformFeeAmount: platformFee.amount,
      paymentFeesAmount: 0,
      totalAmount: total.amount,
      currency: props.currency,
      paymentMethod: null,
      paymentGatewayOrderId: null,
      paymentIntentId: null,
      gatewayPaymentRef: null,
      transactionId: null,
      paidAt: null,
      refundedAt: null,
      refundReason: null,
      expiresAt,
      metadata: props.metadata || null,
      statusHistory: [{ status: OrderStatus.PENDING, timestamp: now }],
      createdAt: now,
      updatedAt: now,
    });

    order.addDomainEvent(
      new OrderCreatedEvent(
        order.id,
        order._userId,
        order._eventId,
        subtotal.amount,
        platformFee.amount,
        total.amount,
        props.currency,
        expiresAt,
      ),
    );

    return Result.ok(order);
  }

  /**
   * Reconstitute an Order from persistence (no validation, no events)
   */
  static reconstitute(props: OrderProps): OrderEntity {
    return new OrderEntity(props);
  }

  // ============================================
  // Getters
  // ============================================

  get userId(): string {
    return this._userId;
  }

  get eventId(): string {
    return this._eventId;
  }

  get items(): readonly OrderItemEntity[] {
    return [...this._items];
  }

  get status(): OrderStatus {
    return this._status;
  }

  get subtotalAmount(): number {
    return this._subtotalAmount;
  }

  get platformFeeAmount(): number {
    return this._platformFeeAmount;
  }

  get paymentFeesAmount(): number {
    return this._paymentFeesAmount;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get currency(): string {
    return this._currency;
  }

  get paymentMethod(): PaymentMethod | null {
    return this._paymentMethod;
  }

  get paymentGatewayOrderId(): string | null {
    return this._paymentGatewayOrderId;
  }

  get paymentIntentId(): string | null {
    return this._paymentIntentId;
  }

  get gatewayPaymentRef(): string | null {
    return this._gatewayPaymentRef;
  }

  get transactionId(): string | null {
    return this._transactionId;
  }

  get paidAt(): Date | null {
    return this._paidAt;
  }

  get refundedAt(): Date | null {
    return this._refundedAt;
  }

  get refundReason(): string | null {
    return this._refundReason;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  get statusHistory(): readonly OrderStatusHistoryEntry[] {
    return [...this._statusHistory];
  }

  get subtotal(): Money {
    return Money.create(this._subtotalAmount, this._currency);
  }

  get platformFee(): Money {
    return Money.create(this._platformFeeAmount, this._currency);
  }

  get total(): Money {
    return Money.create(this._totalAmount, this._currency);
  }

  get itemCount(): number {
    return this._items.length;
  }

  // ============================================
  // Query Methods
  // ============================================

  canBePaid(): boolean {
    return this._status === OrderStatus.PROCESSING && !this.isExpired();
  }

  canBeRefunded(): boolean {
    return this._status === OrderStatus.PAID;
  }

  isExpired(): boolean {
    if (this._status === OrderStatus.CANCELLED) return true;
    if (this._status === OrderStatus.PENDING && new Date() > this._expiresAt) {
      return true;
    }
    return false;
  }

  isPending(): boolean {
    return this._status === OrderStatus.PENDING;
  }

  isProcessing(): boolean {
    return this._status === OrderStatus.PROCESSING;
  }

  isPaid(): boolean {
    return this._status === OrderStatus.PAID;
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Record a status transition in the immutable history
   */
  private recordTransition(status: OrderStatus, reason?: string): void {
    this._statusHistory.push({
      status,
      timestamp: new Date(),
      reason,
    });
  }

  /**
   * Transition order to PROCESSING when payment is initiated
   */
  markAsProcessing(
    paymentMethod: PaymentMethod,
    gatewayRef: string,
  ): Result<void, InvalidOrderStatusException | OrderExpiredException> {
    if (this.isExpired()) {
      return Result.fail(OrderExpiredException.orderExpired(this._id));
    }

    if (!isValidOrderTransition(this._status, OrderStatus.PROCESSING)) {
      return Result.fail(
        InvalidOrderStatusException.invalidTransition(this._status, OrderStatus.PROCESSING),
      );
    }

    this._status = OrderStatus.PROCESSING;
    this._paymentMethod = paymentMethod;
    this._gatewayPaymentRef = gatewayRef;
    this.recordTransition(OrderStatus.PROCESSING);
    this.touch();

    this.addDomainEvent(
      new OrderProcessingEvent(this._id, this._userId, paymentMethod, gatewayRef),
    );

    return Result.okVoid();
  }

  /**
   * Mark order as PAID after successful payment confirmation
   */
  markAsPaid(
    transactionId: string,
    paymentIntentId?: string,
  ): Result<void, InvalidOrderStatusException> {
    if (!isValidOrderTransition(this._status, OrderStatus.PAID)) {
      return Result.fail(
        InvalidOrderStatusException.invalidTransition(this._status, OrderStatus.PAID),
      );
    }

    this._status = OrderStatus.PAID;
    this._transactionId = transactionId;
    this._paymentIntentId = paymentIntentId || this._paymentIntentId;
    this._paidAt = new Date();
    this.recordTransition(OrderStatus.PAID);
    this.touch();

    this.addDomainEvent(
      new OrderPaidEvent(
        this._id,
        this._userId,
        this._eventId,
        transactionId,
        this._totalAmount,
        this._currency,
        this._platformFeeAmount,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Mark order as FAILED after payment failure
   */
  markAsFailed(reason: string): Result<void, InvalidOrderStatusException> {
    if (!isValidOrderTransition(this._status, OrderStatus.FAILED)) {
      return Result.fail(
        InvalidOrderStatusException.invalidTransition(this._status, OrderStatus.FAILED),
      );
    }

    this._status = OrderStatus.FAILED;
    this.recordTransition(OrderStatus.FAILED, reason);
    this.touch();

    this.addDomainEvent(
      new OrderFailedEvent(this._id, this._userId, this._eventId, reason),
    );

    return Result.okVoid();
  }

  /**
   * Cancel the order (user-initiated or system expiration)
   */
  cancel(reason: string): Result<void, InvalidOrderStatusException> {
    if (!isValidOrderTransition(this._status, OrderStatus.CANCELLED)) {
      return Result.fail(
        InvalidOrderStatusException.invalidTransition(this._status, OrderStatus.CANCELLED),
      );
    }

    this._status = OrderStatus.CANCELLED;
    this.recordTransition(OrderStatus.CANCELLED, reason);
    this.touch();

    this.addDomainEvent(
      new OrderCancelledEvent(this._id, this._userId, this._eventId, reason),
    );

    return Result.okVoid();
  }

  /**
   * Expire a pending order that has passed its expiration time
   */
  expire(): Result<void, InvalidOrderStatusException | OrderExpiredException> {
    if (this._status !== OrderStatus.PENDING) {
      return Result.fail(
        InvalidOrderStatusException.invalidTransition(this._status, OrderStatus.CANCELLED),
      );
    }

    if (new Date() <= this._expiresAt) {
      return Result.fail(OrderExpiredException.notYetExpired(this._id));
    }

    this._status = OrderStatus.CANCELLED;
    this.recordTransition(OrderStatus.CANCELLED, 'Order expired');
    this.touch();

    this.addDomainEvent(
      new OrderExpiredEvent(this._id, this._userId, this._eventId),
    );

    return Result.okVoid();
  }

  /**
   * Mark order as REFUNDED
   */
  markAsRefunded(reason: string): Result<void, InvalidOrderStatusException> {
    if (!isValidOrderTransition(this._status, OrderStatus.REFUNDED)) {
      return Result.fail(
        InvalidOrderStatusException.invalidTransition(this._status, OrderStatus.REFUNDED),
      );
    }

    this._status = OrderStatus.REFUNDED;
    this._refundedAt = new Date();
    this._refundReason = reason;
    this.recordTransition(OrderStatus.REFUNDED, reason);
    this.touch();

    this.addDomainEvent(
      new OrderRefundedEvent(
        this._id,
        this._userId,
        this._eventId,
        this._totalAmount,
        this._currency,
        reason,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Set payment gateway fees (calculated after provider selection)
   */
  setPaymentFees(fees: Money): void {
    this._paymentFeesAmount = fees.amount;
    this._totalAmount = this._subtotalAmount + this._platformFeeAmount + fees.amount;
    this.touch();
  }

  /**
   * Set the Stripe payment intent ID
   */
  setPaymentIntentId(intentId: string): void {
    this._paymentIntentId = intentId;
    this.touch();
  }

  /**
   * Set gateway order ID
   */
  setGatewayOrderId(orderId: string): void {
    this._paymentGatewayOrderId = orderId;
    this.touch();
  }

  // ============================================
  // BaseEntity Abstract Methods
  // ============================================

  clone(): OrderEntity {
    return OrderEntity.reconstitute({
      id: this._id,
      userId: this._userId,
      eventId: this._eventId,
      items: [...this._items],
      status: this._status,
      subtotalAmount: this._subtotalAmount,
      platformFeeAmount: this._platformFeeAmount,
      paymentFeesAmount: this._paymentFeesAmount,
      totalAmount: this._totalAmount,
      currency: this._currency,
      paymentMethod: this._paymentMethod,
      paymentGatewayOrderId: this._paymentGatewayOrderId,
      paymentIntentId: this._paymentIntentId,
      gatewayPaymentRef: this._gatewayPaymentRef,
      transactionId: this._transactionId,
      paidAt: this._paidAt,
      refundedAt: this._refundedAt,
      refundReason: this._refundReason,
      expiresAt: this._expiresAt,
      metadata: this._metadata ? { ...this._metadata } : null,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    });
  }

  validate(): void {
    if (!isUUID(this._userId)) {
      throw InvalidOrderException.invalidUserId();
    }
    if (!isUUID(this._eventId)) {
      throw InvalidOrderException.invalidEventId();
    }
    if (this._items.length < OrderEntity.MIN_ITEMS) {
      throw InvalidOrderException.noItems();
    }
    if (this._items.length > OrderEntity.MAX_ITEMS) {
      throw InvalidOrderException.tooManyItems(OrderEntity.MAX_ITEMS);
    }
  }
}
