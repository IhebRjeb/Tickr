import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';
import type { Money } from '@shared/domain/value-objects/money.vo';

import { DuplicateCheckInAttemptedEvent } from '../events/duplicate-check-in-attempted.event';
import { TicketCancelledEvent } from '../events/ticket-cancelled.event';
import { TicketCheckedInEvent } from '../events/ticket-checked-in.event';
import { TicketConfirmedEvent } from '../events/ticket-confirmed.event';
import { TicketExpiredEvent } from '../events/ticket-expired.event';
import { TicketReservedEvent } from '../events/ticket-reserved.event';
import { TicketTransferredEvent } from '../events/ticket-transferred.event';
import { InvalidTicketException } from '../exceptions/invalid-ticket.exception';
import { TicketNotCancellableException } from '../exceptions/ticket-not-cancellable.exception';
import { TicketNotCheckableInException } from '../exceptions/ticket-not-checkable-in.exception';
import { TicketNotConfirmableException } from '../exceptions/ticket-not-confirmable.exception';
import { TicketNotExpirableException } from '../exceptions/ticket-not-expirable.exception';
import { TicketNotTransferableException } from '../exceptions/ticket-not-transferable.exception';
import { CheckInResultVO } from '../value-objects/check-in-result.vo';
import { QRCodeVO } from '../value-objects/qr-code.vo';
import { TicketStatus } from '../value-objects/ticket-status.vo';

// ============================================
// Internal Interfaces (Not Exported)
// ============================================

/**
 * Props for creating a new reserved ticket
 * @internal
 */
interface CreateReservationProps {
  id?: string;
  eventId: string;
  ticketTypeId: string;
  userId: string;
  qrCode: QRCodeVO;
  price: Money;
  holderName: string;
  holderEmail: string;
  holderPhone?: string | null;
  reservedUntil: Date;
}

/**
 * Props for reconstituting a ticket from persistence
 * @internal
 */
interface TicketProps {
  id: string;
  eventId: string;
  ticketTypeId: string;
  orderId: string | null;
  userId: string;
  qrCode: QRCodeVO;
  status: TicketStatus;
  priceAmount: number;
  priceCurrency: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string | null;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  transferredTo: string | null;
  transferredAt: Date | null;
  transferCount: number;
  reservedUntil: Date | null;
  pdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ticket Aggregate Root
 *
 * The main aggregate for the Tickets bounded context.
 * Manages ticket lifecycle from reservation to check-in.
 *
 * Lifecycle States:
 * - RESERVED: Ticket held during payment process (15 min TTL)
 * - CONFIRMED: Payment successful, QR code active
 * - CANCELLED: Payment failed, refunded, or user abandoned
 * - CHECKED_IN: Scanned at venue entrance
 * - EXPIRED: Reservation expired without payment
 *
 * Business Rules:
 * - QR code is globally unique (v1-{uuid}-{checksum})
 * - Reservation expires after 15 minutes
 * - Only CONFIRMED tickets can be checked in
 * - Duplicate check-in emits fraud alert
 * - Transfer limited to 3 times per ticket
 * - Transfer generates a new QR code
 * - Price is frozen at reservation time
 */
export class TicketEntity extends BaseEntity<TicketEntity> {
  // ============================================
  // Constants
  // ============================================

  private static readonly MAX_HOLDER_NAME_LENGTH = 200;
  private static readonly MAX_TRANSFER_COUNT = 3;

  // ============================================
  // Private Properties
  // ============================================

  private _eventId: string;
  private _ticketTypeId: string;
  private _orderId: string | null;
  private _userId: string;
  private _qrCode: QRCodeVO;
  private _status: TicketStatus;
  private _priceAmount: number;
  private _priceCurrency: string;
  private _holderName: string;
  private _holderEmail: string;
  private _holderPhone: string | null;
  private _checkedInAt: Date | null;
  private _checkedInBy: string | null;
  private _transferredTo: string | null;
  private _transferredAt: Date | null;
  private _transferCount: number;
  private _reservedUntil: Date | null;
  private _pdfUrl: string | null;

  // ============================================
  // Constructor
  // ============================================

  private constructor(props: TicketProps) {
    super(props.id, props.createdAt);
    this._eventId = props.eventId;
    this._ticketTypeId = props.ticketTypeId;
    this._orderId = props.orderId;
    this._userId = props.userId;
    this._qrCode = props.qrCode;
    this._status = props.status;
    this._priceAmount = props.priceAmount;
    this._priceCurrency = props.priceCurrency;
    this._holderName = props.holderName;
    this._holderEmail = props.holderEmail;
    this._holderPhone = props.holderPhone;
    this._checkedInAt = props.checkedInAt;
    this._checkedInBy = props.checkedInBy;
    this._transferredTo = props.transferredTo;
    this._transferredAt = props.transferredAt;
    this._transferCount = props.transferCount;
    this._reservedUntil = props.reservedUntil;
    this._pdfUrl = props.pdfUrl;
    this._updatedAt = props.updatedAt;
  }

  // ============================================
  // Getters
  // ============================================

  get eventId(): string {
    return this._eventId;
  }

  get ticketTypeId(): string {
    return this._ticketTypeId;
  }

  get orderId(): string | null {
    return this._orderId;
  }

  get userId(): string {
    return this._userId;
  }

  get qrCode(): QRCodeVO {
    return this._qrCode;
  }

  get status(): TicketStatus {
    return this._status;
  }

  get priceAmount(): number {
    return this._priceAmount;
  }

  get priceCurrency(): string {
    return this._priceCurrency;
  }

  get holderName(): string {
    return this._holderName;
  }

  get holderEmail(): string {
    return this._holderEmail;
  }

  get holderPhone(): string | null {
    return this._holderPhone;
  }

  get checkedInAt(): Date | null {
    return this._checkedInAt;
  }

  get checkedInBy(): string | null {
    return this._checkedInBy;
  }

  get transferredTo(): string | null {
    return this._transferredTo;
  }

  get transferredAt(): Date | null {
    return this._transferredAt;
  }

  get transferCount(): number {
    return this._transferCount;
  }

  get reservedUntil(): Date | null {
    return this._reservedUntil;
  }

  get pdfUrl(): string | null {
    return this._pdfUrl;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Check if ticket can be checked in (status-level only)
   * Event timing validation is the handler's responsibility
   */
  canBeCheckedIn(): boolean {
    return this._status === TicketStatus.CONFIRMED;
  }

  /**
   * Check if ticket can be transferred
   */
  canBeTransferred(): boolean {
    return (
      this._status === TicketStatus.CONFIRMED &&
      this._transferCount < TicketEntity.MAX_TRANSFER_COUNT
    );
  }

  /**
   * Check if reservation has expired
   */
  isExpired(): boolean {
    if (this._status === TicketStatus.EXPIRED) return true;
    if (
      this._status === TicketStatus.RESERVED &&
      this._reservedUntil &&
      new Date() > this._reservedUntil
    ) {
      return true;
    }
    return false;
  }

  isReserved(): boolean {
    return this._status === TicketStatus.RESERVED;
  }

  isConfirmed(): boolean {
    return this._status === TicketStatus.CONFIRMED;
  }

  isCancelled(): boolean {
    return this._status === TicketStatus.CANCELLED;
  }

  isCheckedIn(): boolean {
    return this._status === TicketStatus.CHECKED_IN;
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Confirm a reserved ticket after successful payment
   *
   * Business Rules:
   * - Only RESERVED tickets can be confirmed
   * - orderId must be a valid UUID
   */
  confirm(orderId: string): Result<void, TicketNotConfirmableException> {
    if (this._status !== TicketStatus.RESERVED) {
      return Result.fail(
        TicketNotConfirmableException.wrongStatus(this._status),
      );
    }

    this._status = TicketStatus.CONFIRMED;
    this._orderId = orderId;
    this._reservedUntil = null;
    this.touch();

    this.addDomainEvent(
      new TicketConfirmedEvent(
        this._id,
        this._eventId,
        this._ticketTypeId,
        orderId,
        this._userId,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Cancel a ticket (from RESERVED or CONFIRMED)
   *
   * Business Rules:
   * - Only RESERVED or CONFIRMED tickets can be cancelled
   * - If confirmed, a refund may be initiated via domain event
   */
  cancel(reason: string): Result<void, TicketNotCancellableException> {
    if (this._status === TicketStatus.CANCELLED) {
      return Result.fail(
        TicketNotCancellableException.alreadyCancelled(),
      );
    }

    if (
      this._status !== TicketStatus.RESERVED &&
      this._status !== TicketStatus.CONFIRMED
    ) {
      return Result.fail(
        TicketNotCancellableException.wrongStatus(this._status),
      );
    }

    const wasConfirmed = this._status === TicketStatus.CONFIRMED;
    this._status = TicketStatus.CANCELLED;
    this.touch();

    this.addDomainEvent(
      new TicketCancelledEvent(
        this._id,
        this._eventId,
        this._ticketTypeId,
        this._userId,
        reason?.trim() || 'No reason provided',
        this._priceAmount,
        this._priceCurrency,
        wasConfirmed,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Check in a ticket at the venue entrance
   *
   * Business Rules:
   * - Only CONFIRMED tickets can be checked in
   * - Duplicate check-in emits fraud detection event and returns failure
   * - Event window validation is handled by the application layer
   *
   * @param staffId - UUID of the staff member scanning
   * @param locationGate - Gate/entrance identifier
   * @param holderDisplayName - Name for the check-in result display
   * @param ticketTypeName - Ticket type name for the check-in result display
   */
  checkIn(
    staffId: string,
    locationGate: string,
    holderDisplayName: string,
    ticketTypeName: string,
  ): Result<CheckInResultVO, TicketNotCheckableInException> {
    // Duplicate check-in detection (fraud alert)
    if (this._status === TicketStatus.CHECKED_IN) {
      this.addDomainEvent(
        new DuplicateCheckInAttemptedEvent(
          this._id,
          this._eventId,
          staffId,
          this._checkedInAt!,
        ),
      );

      return Result.fail(
        TicketNotCheckableInException.alreadyCheckedIn(this._checkedInAt!),
      );
    }

    if (this._status !== TicketStatus.CONFIRMED) {
      return Result.fail(
        TicketNotCheckableInException.wrongStatus(this._status),
      );
    }

    const checkedInAt = new Date();
    this._status = TicketStatus.CHECKED_IN;
    this._checkedInAt = checkedInAt;
    this._checkedInBy = staffId;
    this.touch();

    this.addDomainEvent(
      new TicketCheckedInEvent(
        this._id,
        this._eventId,
        staffId,
        locationGate,
        checkedInAt,
      ),
    );

    return Result.ok(
      CheckInResultVO.success(
        this._id,
        holderDisplayName,
        ticketTypeName,
        checkedInAt,
      ),
    );
  }

  /**
   * Transfer ticket to a new owner
   *
   * Business Rules:
   * - Only CONFIRMED tickets can be transferred
   * - Cannot transfer after check-in
   * - Maximum 3 transfers per ticket
   * - Generates a new QR code for security
   */
  transfer(
    newOwnerId: string,
    newOwnerEmail: string,
  ): Result<QRCodeVO, TicketNotTransferableException> {
    if (this._status === TicketStatus.CHECKED_IN) {
      return Result.fail(
        TicketNotTransferableException.alreadyCheckedIn(),
      );
    }

    if (this._status !== TicketStatus.CONFIRMED) {
      return Result.fail(
        TicketNotTransferableException.wrongStatus(this._status),
      );
    }

    if (this._transferCount >= TicketEntity.MAX_TRANSFER_COUNT) {
      return Result.fail(
        TicketNotTransferableException.maxTransfersReached(
          TicketEntity.MAX_TRANSFER_COUNT,
        ),
      );
    }

    const previousUserId = this._userId;
    const newQRCode = QRCodeVO.generate();

    this._userId = newOwnerId;
    this._holderEmail = newOwnerEmail;
    this._qrCode = newQRCode;
    this._transferredTo = newOwnerId;
    this._transferredAt = new Date();
    this._transferCount += 1;
    this._pdfUrl = null; // Invalidate old PDF
    this.touch();

    this.addDomainEvent(
      new TicketTransferredEvent(
        this._id,
        this._eventId,
        previousUserId,
        newOwnerId,
        newQRCode.value,
        this._transferCount,
      ),
    );

    return Result.ok(newQRCode);
  }

  /**
   * Expire a reserved ticket that was not paid in time
   *
   * Business Rules:
   * - Only RESERVED tickets can be expired
   */
  expire(): Result<void, TicketNotExpirableException> {
    if (this._status !== TicketStatus.RESERVED) {
      return Result.fail(
        TicketNotExpirableException.wrongStatus(this._status),
      );
    }

    this._status = TicketStatus.EXPIRED;
    this.touch();

    this.addDomainEvent(
      new TicketExpiredEvent(
        this._id,
        this._eventId,
        this._ticketTypeId,
        this._userId,
        this._reservedUntil!,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Set PDF URL after generation
   */
  setPdfUrl(url: string): void {
    this._pdfUrl = url;
    this.touch();
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create a new reserved ticket
   *
   * Validates all input fields, sets status to RESERVED,
   * and emits a TicketReservedEvent.
   */
  static createReservation(
    props: CreateReservationProps,
  ): Result<TicketEntity, InvalidTicketException> {
    // Validate eventId
    if (!props.eventId || !isUUID(props.eventId)) {
      return Result.fail(InvalidTicketException.invalidUUID('eventId'));
    }

    // Validate ticketTypeId
    if (!props.ticketTypeId || !isUUID(props.ticketTypeId)) {
      return Result.fail(InvalidTicketException.invalidUUID('ticketTypeId'));
    }

    // Validate userId
    if (!props.userId || !isUUID(props.userId)) {
      return Result.fail(InvalidTicketException.invalidUUID('userId'));
    }

    // Validate holderName
    const trimmedName = props.holderName?.trim();
    if (!trimmedName) {
      return Result.fail(InvalidTicketException.missingHolderName());
    }
    if (trimmedName.length > TicketEntity.MAX_HOLDER_NAME_LENGTH) {
      return Result.fail(
        InvalidTicketException.holderNameTooLong(
          TicketEntity.MAX_HOLDER_NAME_LENGTH,
        ),
      );
    }

    // Validate holderEmail
    if (!props.holderEmail || !props.holderEmail.trim()) {
      return Result.fail(InvalidTicketException.missingHolderEmail());
    }

    // Validate price
    if (props.price.amount < 0) {
      return Result.fail(InvalidTicketException.invalidPrice());
    }

    // Validate reservedUntil
    if (!props.reservedUntil) {
      return Result.fail(InvalidTicketException.missingReservedUntil());
    }

    const id = props.id || generateUUID();

    const ticket = new TicketEntity({
      id,
      eventId: props.eventId,
      ticketTypeId: props.ticketTypeId,
      orderId: null,
      userId: props.userId,
      qrCode: props.qrCode,
      status: TicketStatus.RESERVED,
      priceAmount: props.price.amount,
      priceCurrency: props.price.currency,
      holderName: trimmedName,
      holderEmail: props.holderEmail.trim(),
      holderPhone: props.holderPhone?.trim() || null,
      checkedInAt: null,
      checkedInBy: null,
      transferredTo: null,
      transferredAt: null,
      transferCount: 0,
      reservedUntil: props.reservedUntil,
      pdfUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ticket.addDomainEvent(
      new TicketReservedEvent(
        ticket._id,
        ticket._eventId,
        ticket._ticketTypeId,
        ticket._userId,
        ticket._qrCode.value,
        ticket._priceAmount,
        ticket._priceCurrency,
        ticket._reservedUntil!,
      ),
    );

    return Result.ok(ticket);
  }

  /**
   * Reconstitute a ticket from persistence
   * No validation, no events — assumes data is valid from DB
   */
  static reconstitute(props: TicketProps): TicketEntity {
    return new TicketEntity(props);
  }

  // ============================================
  // BaseEntity Implementation
  // ============================================

  clone(): TicketEntity {
    return new TicketEntity({
      id: this._id,
      eventId: this._eventId,
      ticketTypeId: this._ticketTypeId,
      orderId: this._orderId,
      userId: this._userId,
      qrCode: this._qrCode,
      status: this._status,
      priceAmount: this._priceAmount,
      priceCurrency: this._priceCurrency,
      holderName: this._holderName,
      holderEmail: this._holderEmail,
      holderPhone: this._holderPhone,
      checkedInAt: this._checkedInAt,
      checkedInBy: this._checkedInBy,
      transferredTo: this._transferredTo,
      transferredAt: this._transferredAt,
      transferCount: this._transferCount,
      reservedUntil: this._reservedUntil,
      pdfUrl: this._pdfUrl,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    });
  }

  validate(): void {
    if (!this._eventId || !isUUID(this._eventId)) {
      throw InvalidTicketException.invalidUUID('eventId');
    }
    if (!this._ticketTypeId || !isUUID(this._ticketTypeId)) {
      throw InvalidTicketException.invalidUUID('ticketTypeId');
    }
    if (!this._userId || !isUUID(this._userId)) {
      throw InvalidTicketException.invalidUUID('userId');
    }
    if (!this._holderName || this._holderName.trim().length === 0) {
      throw InvalidTicketException.missingHolderName();
    }
    if (!this._holderEmail || this._holderEmail.trim().length === 0) {
      throw InvalidTicketException.missingHolderEmail();
    }
  }
}
