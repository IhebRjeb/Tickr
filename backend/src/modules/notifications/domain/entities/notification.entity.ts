import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';

import { NotificationDeliveredEvent } from '../events/notification-delivered.event';
import { NotificationFailedEvent } from '../events/notification-failed.event';
import { NotificationRetryingEvent } from '../events/notification-retrying.event';
import { NotificationScheduledEvent } from '../events/notification-scheduled.event';
import { NotificationSentEvent } from '../events/notification-sent.event';
import { InvalidNotificationException } from '../exceptions/invalid-notification.exception';
import { MaxRetriesExceededException } from '../exceptions/max-retries-exceeded.exception';
import { NotificationNotSendableException } from '../exceptions/notification-not-sendable.exception';
import { NotificationChannel } from '../value-objects/notification-channel.vo';
import { NotificationPriority } from '../value-objects/notification-priority.vo';
import {
  NotificationStatus,
  isValidNotificationTransition,
} from '../value-objects/notification-status.vo';
import { NotificationType } from '../value-objects/notification-type.vo';
import { RecipientVO } from '../value-objects/recipient.vo';

// ============================================
// Internal Interfaces (Not Exported)
// ============================================

/**
 * Props for creating a new notification
 * @internal
 */
interface CreateNotificationProps {
  id?: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  subject: string | null;
  content: string;
  templateId: string | null;
  templateData: Record<string, unknown>;
  recipient: RecipientVO;
  scheduledFor?: Date | null;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Props for reconstituting a notification from persistence
 * @internal
 */
interface NotificationProps {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  subject: string | null;
  content: string;
  templateId: string | null;
  templateData: Record<string, unknown>;
  recipient: RecipientVO;
  status: NotificationStatus;
  scheduledFor: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failureReason: string | null;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Aggregate Root
 *
 * The main aggregate for the Notifications bounded context.
 * Manages notification lifecycle from creation to delivery.
 *
 * Lifecycle States:
 * - PENDING: Queued for sending
 * - SENDING: Currently being dispatched to provider
 * - SENT: Successfully sent to provider
 * - DELIVERED: Confirmed delivery to recipient
 * - FAILED: Delivery failed (may retry)
 *
 * Business Rules:
 * - EMAIL notifications require a subject
 * - Maximum 3 retries with exponential backoff (5min, 30min, 2h)
 * - HIGH priority bypasses user rate limits
 * - Status transitions are strictly validated
 * - Failed notifications can retry back to PENDING
 */
export class NotificationEntity extends BaseEntity<NotificationEntity> {
  // ============================================
  // Constants
  // ============================================

  private static readonly DEFAULT_MAX_RETRIES = 3;

  // ============================================
  // Private Properties
  // ============================================

  private _userId: string;
  private _type: NotificationType;
  private _channel: NotificationChannel;
  private _priority: NotificationPriority;
  private _subject: string | null;
  private _content: string;
  private _templateId: string | null;
  private _templateData: Record<string, unknown>;
  private _recipient: RecipientVO;
  private _status: NotificationStatus;
  private _scheduledFor: Date | null;
  private _sentAt: Date | null;
  private _deliveredAt: Date | null;
  private _failureReason: string | null;
  private _retryCount: number;
  private _maxRetries: number;
  private _metadata: Record<string, unknown>;

  // ============================================
  // Constructor
  // ============================================

  private constructor(props: NotificationProps) {
    super(props.id, props.createdAt);
    this._userId = props.userId;
    this._type = props.type;
    this._channel = props.channel;
    this._priority = props.priority;
    this._subject = props.subject;
    this._content = props.content;
    this._templateId = props.templateId;
    this._templateData = props.templateData;
    this._recipient = props.recipient;
    this._status = props.status;
    this._scheduledFor = props.scheduledFor;
    this._sentAt = props.sentAt;
    this._deliveredAt = props.deliveredAt;
    this._failureReason = props.failureReason;
    this._retryCount = props.retryCount;
    this._maxRetries = props.maxRetries;
    this._metadata = props.metadata;
    this._updatedAt = props.updatedAt;
  }

  // ============================================
  // Getters
  // ============================================

  get userId(): string {
    return this._userId;
  }

  get type(): NotificationType {
    return this._type;
  }

  get channel(): NotificationChannel {
    return this._channel;
  }

  get priority(): NotificationPriority {
    return this._priority;
  }

  get subject(): string | null {
    return this._subject;
  }

  get content(): string {
    return this._content;
  }

  get templateId(): string | null {
    return this._templateId;
  }

  get templateData(): Record<string, unknown> {
    return { ...this._templateData };
  }

  get recipient(): RecipientVO {
    return this._recipient;
  }

  get status(): NotificationStatus {
    return this._status;
  }

  get scheduledFor(): Date | null {
    return this._scheduledFor;
  }

  get sentAt(): Date | null {
    return this._sentAt;
  }

  get deliveredAt(): Date | null {
    return this._deliveredAt;
  }

  get failureReason(): string | null {
    return this._failureReason;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get maxRetries(): number {
    return this._maxRetries;
  }

  get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Check if the notification can be retried
   */
  canRetry(): boolean {
    return (
      this._status === NotificationStatus.FAILED &&
      this._retryCount < this._maxRetries
    );
  }

  /**
   * Check if notification has expired (past its scheduled window)
   */
  isExpired(): boolean {
    if (!this._scheduledFor) return false;
    const expiryWindow = 24 * 60 * 60 * 1000; // 24 hours after scheduled time
    return Date.now() > this._scheduledFor.getTime() + expiryWindow;
  }

  /**
   * Check if notification is ready to send (scheduled time has passed or is immediate)
   */
  isReadyToSend(): boolean {
    if (this._status !== NotificationStatus.PENDING) return false;
    if (!this._scheduledFor) return true;
    return Date.now() >= this._scheduledFor.getTime();
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create a new notification
   */
  static create(
    props: CreateNotificationProps,
  ): Result<NotificationEntity, InvalidNotificationException> {
    // Validate userId
    if (!props.userId || !isUUID(props.userId)) {
      return Result.fail(InvalidNotificationException.invalidUUID('userId'));
    }

    // Validate content
    if (!props.content || props.content.trim().length === 0) {
      return Result.fail(InvalidNotificationException.missingContent());
    }

    // Validate subject for EMAIL channel
    if (
      props.channel === NotificationChannel.EMAIL &&
      (!props.subject || props.subject.trim().length === 0)
    ) {
      return Result.fail(
        InvalidNotificationException.subjectRequiredForEmail(),
      );
    }

    // Validate recipient
    if (!props.recipient) {
      return Result.fail(InvalidNotificationException.missingRecipient());
    }

    const id = props.id || generateUUID();
    const now = new Date();

    const notification = new NotificationEntity({
      id,
      userId: props.userId,
      type: props.type,
      channel: props.channel,
      priority: props.priority ?? NotificationPriority.MEDIUM,
      subject: props.subject,
      content: props.content,
      templateId: props.templateId,
      templateData: props.templateData ?? {},
      recipient: props.recipient,
      status: NotificationStatus.PENDING,
      scheduledFor: props.scheduledFor ?? null,
      sentAt: null,
      deliveredAt: null,
      failureReason: null,
      retryCount: 0,
      maxRetries:
        props.maxRetries ?? NotificationEntity.DEFAULT_MAX_RETRIES,
      metadata: props.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    });

    notification.addDomainEvent(
      new NotificationScheduledEvent(
        id,
        props.userId,
        props.type,
        props.channel,
        props.priority ?? NotificationPriority.MEDIUM,
        props.scheduledFor ?? null,
      ),
    );

    return Result.ok(notification);
  }

  /**
   * Reconstitute a notification from persistence (no validation, no events)
   */
  static reconstitute(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Schedule the notification for a future time
   */
  schedule(
    sendAt: Date,
  ): Result<void, NotificationNotSendableException> {
    if (this._status !== NotificationStatus.PENDING) {
      return Result.fail(
        NotificationNotSendableException.invalidStatus(
          this._status,
          'PENDING (to schedule)',
        ),
      );
    }

    this._scheduledFor = sendAt;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Mark as currently being sent
   */
  markAsSending(): Result<void, NotificationNotSendableException> {
    if (
      !isValidNotificationTransition(
        this._status,
        NotificationStatus.SENDING,
      )
    ) {
      return Result.fail(
        NotificationNotSendableException.invalidStatus(
          this._status,
          NotificationStatus.SENDING,
        ),
      );
    }

    this._status = NotificationStatus.SENDING;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Mark as successfully sent to provider
   */
  markAsSent(
    messageId: string,
  ): Result<void, NotificationNotSendableException> {
    if (
      !isValidNotificationTransition(
        this._status,
        NotificationStatus.SENT,
      )
    ) {
      return Result.fail(
        NotificationNotSendableException.invalidStatus(
          this._status,
          NotificationStatus.SENT,
        ),
      );
    }

    this._status = NotificationStatus.SENT;
    this._sentAt = new Date();
    this.touch();

    this.addDomainEvent(
      new NotificationSentEvent(
        this._id,
        this._userId,
        this._channel,
        messageId,
        this._sentAt,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Mark as confirmed delivered
   */
  markAsDelivered(): Result<void, NotificationNotSendableException> {
    if (
      !isValidNotificationTransition(
        this._status,
        NotificationStatus.DELIVERED,
      )
    ) {
      return Result.fail(
        NotificationNotSendableException.invalidStatus(
          this._status,
          NotificationStatus.DELIVERED,
        ),
      );
    }

    this._status = NotificationStatus.DELIVERED;
    this._deliveredAt = new Date();
    this.touch();

    this.addDomainEvent(
      new NotificationDeliveredEvent(this._id, this._deliveredAt),
    );

    return Result.okVoid();
  }

  /**
   * Mark as failed
   */
  markAsFailed(
    reason: string,
  ): Result<void, NotificationNotSendableException> {
    if (
      !isValidNotificationTransition(
        this._status,
        NotificationStatus.FAILED,
      )
    ) {
      return Result.fail(
        NotificationNotSendableException.invalidStatus(
          this._status,
          NotificationStatus.FAILED,
        ),
      );
    }

    this._status = NotificationStatus.FAILED;
    this._failureReason = reason;
    this.touch();

    this.addDomainEvent(
      new NotificationFailedEvent(
        this._id,
        reason,
        this._retryCount,
        this.canRetry(),
      ),
    );

    return Result.okVoid();
  }

  /**
   * Increment retry count and reset to PENDING for re-processing
   */
  incrementRetry(): Result<void, MaxRetriesExceededException> {
    if (!this.canRetry()) {
      return Result.fail(
        MaxRetriesExceededException.forNotification(
          this._id,
          this._maxRetries,
        ),
      );
    }

    this._retryCount += 1;
    this._status = NotificationStatus.PENDING;
    this._failureReason = null;
    this.touch();

    // Calculate next retry time using exponential backoff
    const retryIntervals = [
      5 * 60 * 1000, // 5 minutes
      30 * 60 * 1000, // 30 minutes
      2 * 60 * 60 * 1000, // 2 hours
    ];
    const interval =
      retryIntervals[Math.min(this._retryCount - 1, retryIntervals.length - 1)];
    const nextRetryAt = new Date(Date.now() + interval);
    this._scheduledFor = nextRetryAt;

    this.addDomainEvent(
      new NotificationRetryingEvent(
        this._id,
        this._retryCount,
        nextRetryAt,
      ),
    );

    return Result.okVoid();
  }

  // ============================================
  // BaseEntity Implementations
  // ============================================

  clone(): NotificationEntity {
    return new NotificationEntity({
      id: this._id,
      userId: this._userId,
      type: this._type,
      channel: this._channel,
      priority: this._priority,
      subject: this._subject,
      content: this._content,
      templateId: this._templateId,
      templateData: { ...this._templateData },
      recipient: this._recipient,
      status: this._status,
      scheduledFor: this._scheduledFor,
      sentAt: this._sentAt,
      deliveredAt: this._deliveredAt,
      failureReason: this._failureReason,
      retryCount: this._retryCount,
      maxRetries: this._maxRetries,
      metadata: { ...this._metadata },
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    });
  }

  validate(): void {
    if (!this._userId) {
      throw InvalidNotificationException.missingUserId();
    }
    if (!this._content) {
      throw InvalidNotificationException.missingContent();
    }
  }
}
