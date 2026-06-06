import { generateUUID } from '@shared/domain/utils';
import { Money } from '@shared/domain/value-objects/money.vo';

import { PaymentMethod } from '../value-objects/payment-method.vo';
import { PaymentStatus } from '../value-objects/payment-status.vo';

// ============================================
// Interfaces
// ============================================

export interface CreatePaymentProps {
  orderId: string;
  amount: Money;
  provider: PaymentMethod;
}

export interface PaymentProps {
  id: string;
  orderId: string;
  amountValue: number;
  amountCurrency: string;
  provider: PaymentMethod;
  status: PaymentStatus;
  gatewayResponse: Record<string, unknown> | null;
  gatewayPaymentRef: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptNumber: number;
  createdAt: Date;
}

// ============================================
// Payment Entity
// ============================================

/**
 * Payment Entity (Audit Trail)
 *
 * Records each payment attempt for an order.
 * Maximum 3 attempts per order.
 *
 * Business Rules:
 * - Each attempt increments attemptNumber
 * - Gateway response stored for debugging
 * - Error details preserved on failure
 */
export class PaymentEntity {
  static readonly MAX_ATTEMPTS = 3;

  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _amountValue: number;
  private readonly _amountCurrency: string;
  private readonly _provider: PaymentMethod;
  private _status: PaymentStatus;
  private _gatewayResponse: Record<string, unknown> | null;
  private _gatewayPaymentRef: string | null;
  private _errorCode: string | null;
  private _errorMessage: string | null;
  private _attemptNumber: number;
  private readonly _createdAt: Date;

  private constructor(props: PaymentProps) {
    this._id = props.id;
    this._orderId = props.orderId;
    this._amountValue = props.amountValue;
    this._amountCurrency = props.amountCurrency;
    this._provider = props.provider;
    this._status = props.status;
    this._gatewayResponse = props.gatewayResponse;
    this._gatewayPaymentRef = props.gatewayPaymentRef;
    this._errorCode = props.errorCode;
    this._errorMessage = props.errorMessage;
    this._attemptNumber = props.attemptNumber;
    this._createdAt = props.createdAt;
  }

  // ============================================
  // Static Factories
  // ============================================

  static create(props: CreatePaymentProps): PaymentEntity {
    return new PaymentEntity({
      id: generateUUID(),
      orderId: props.orderId,
      amountValue: props.amount.amount,
      amountCurrency: props.amount.currency,
      provider: props.provider,
      status: PaymentStatus.PENDING,
      gatewayResponse: null,
      gatewayPaymentRef: null,
      errorCode: null,
      errorMessage: null,
      attemptNumber: 1,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: PaymentProps): PaymentEntity {
    return new PaymentEntity(props);
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

  get provider(): PaymentMethod {
    return this._provider;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get gatewayResponse(): Record<string, unknown> | null {
    return this._gatewayResponse;
  }

  get gatewayPaymentRef(): string | null {
    return this._gatewayPaymentRef;
  }

  get errorCode(): string | null {
    return this._errorCode;
  }

  get errorMessage(): string | null {
    return this._errorMessage;
  }

  get attemptNumber(): number {
    return this._attemptNumber;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // ============================================
  // Query Methods
  // ============================================

  isSuccess(): boolean {
    return this._status === PaymentStatus.SUCCESS;
  }

  isFailed(): boolean {
    return this._status === PaymentStatus.FAILED;
  }

  isPending(): boolean {
    return this._status === PaymentStatus.PENDING;
  }

  canRetry(): boolean {
    return this._attemptNumber < PaymentEntity.MAX_ATTEMPTS;
  }

  // ============================================
  // Command Methods
  // ============================================

  markAsSuccess(gatewayResponse: Record<string, unknown>, gatewayPaymentRef?: string): void {
    this._status = PaymentStatus.SUCCESS;
    this._gatewayResponse = gatewayResponse;
    if (gatewayPaymentRef) {
      this._gatewayPaymentRef = gatewayPaymentRef;
    }
  }

  markAsFailed(errorCode: string, errorMessage: string, gatewayResponse?: Record<string, unknown>): void {
    this._status = PaymentStatus.FAILED;
    this._errorCode = errorCode;
    this._errorMessage = errorMessage;
    if (gatewayResponse) {
      this._gatewayResponse = gatewayResponse;
    }
  }

  setGatewayPaymentRef(ref: string): void {
    this._gatewayPaymentRef = ref;
  }

  incrementAttempt(): void {
    if (this._attemptNumber >= PaymentEntity.MAX_ATTEMPTS) {
      throw new Error(`Maximum payment attempts (${PaymentEntity.MAX_ATTEMPTS}) exceeded`);
    }
    this._attemptNumber += 1;
  }
}
