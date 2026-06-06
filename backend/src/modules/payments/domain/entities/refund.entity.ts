import { generateUUID } from '@shared/domain/utils';
import { Money } from '@shared/domain/value-objects/money.vo';

import { RefundStatus } from '../value-objects/refund-status.vo';

// ============================================
// Interfaces
// ============================================

export interface CreateRefundProps {
  orderId: string;
  amount: Money;
  reason: string;
}

export interface RefundProps {
  id: string;
  orderId: string;
  amountValue: number;
  amountCurrency: string;
  reason: string;
  status: RefundStatus;
  gatewayRefundId: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

// ============================================
// Refund Entity
// ============================================

/**
 * Refund Entity
 *
 * Tracks refund requests and their processing status.
 *
 * Business Rules:
 * - Refund amount <= order total minus platform fee (commission non-refundable)
 * - Refund must be requested within refund window (24h before event)
 * - Processing time: 5-10 business days
 * - Konnect: manual via dashboard
 * - Paymee/Stripe: automated via API
 */
export class RefundEntity {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _amountValue: number;
  private readonly _amountCurrency: string;
  private readonly _reason: string;
  private _status: RefundStatus;
  private _gatewayRefundId: string | null;
  private _processedAt: Date | null;
  private readonly _createdAt: Date;

  private constructor(props: RefundProps) {
    this._id = props.id;
    this._orderId = props.orderId;
    this._amountValue = props.amountValue;
    this._amountCurrency = props.amountCurrency;
    this._reason = props.reason;
    this._status = props.status;
    this._gatewayRefundId = props.gatewayRefundId;
    this._processedAt = props.processedAt;
    this._createdAt = props.createdAt;
  }

  // ============================================
  // Static Factories
  // ============================================

  static create(props: CreateRefundProps): RefundEntity {
    return new RefundEntity({
      id: generateUUID(),
      orderId: props.orderId,
      amountValue: props.amount.amount,
      amountCurrency: props.amount.currency,
      reason: props.reason,
      status: RefundStatus.PENDING,
      gatewayRefundId: null,
      processedAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RefundProps): RefundEntity {
    return new RefundEntity(props);
  }

  // ============================================
  // Getters
  // ============================================

  get id(): string {
    return this._id;
  }

  get orderId(): string {
    return this._orderId;
  }

  get amountValue(): number {
    return this._amountValue;
  }

  get amountCurrency(): string {
    return this._amountCurrency;
  }

  get amount(): Money {
    return Money.create(this._amountValue, this._amountCurrency);
  }

  get reason(): string {
    return this._reason;
  }

  get status(): RefundStatus {
    return this._status;
  }

  get gatewayRefundId(): string | null {
    return this._gatewayRefundId;
  }

  get processedAt(): Date | null {
    return this._processedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // ============================================
  // Query Methods
  // ============================================

  isPending(): boolean {
    return this._status === RefundStatus.PENDING;
  }

  isCompleted(): boolean {
    return this._status === RefundStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this._status === RefundStatus.FAILED;
  }

  // ============================================
  // Command Methods
  // ============================================

  markAsCompleted(gatewayRefundId?: string): void {
    this._status = RefundStatus.COMPLETED;
    this._processedAt = new Date();
    if (gatewayRefundId) {
      this._gatewayRefundId = gatewayRefundId;
    }
  }

  markAsFailed(reason?: string): void {
    this._status = RefundStatus.FAILED;
    if (reason) {
      // Append failure context to existing reason is not needed —
      // the original reason stays, failure is tracked by status
    }
  }
}
