import { randomBytes } from 'crypto';

import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';

import { PreferencesUpdatedEvent } from '../events/preferences-updated.event';
import { UserUnsubscribedEvent } from '../events/user-unsubscribed.event';
import { PreferenceNotAllowedException } from '../exceptions/preference-not-allowed.exception';
import {
  NotificationType,
  isMarketingType,
  isReminderType,
  isTransactionalType,
} from '../value-objects/notification-type.vo';

// ============================================
// Internal Interfaces (Not Exported)
// ============================================

/**
 * Props for creating new preferences
 * @internal
 */
interface CreatePreferenceProps {
  id?: string;
  userId: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  marketingEnabled?: boolean;
  eventRemindersEnabled?: boolean;
}

/**
 * Props for reconstituting from persistence
 * @internal
 */
interface PreferenceProps {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  marketingEnabled: boolean;
  eventRemindersEnabled: boolean;
  unsubscribeToken: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update payload for preferences
 */
interface PreferenceUpdates {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  marketingEnabled?: boolean;
  eventRemindersEnabled?: boolean;
}

/**
 * NotificationPreference Entity
 *
 * Manages per-user notification opt-in/opt-out settings.
 *
 * Business Rules:
 * - Transactional notifications CANNOT be disabled
 * - Marketing requires explicit opt-in (default false)
 * - Event reminders enabled by default
 * - Unsubscribe token is crypto-random, unique per user
 * - One-click unsubscribe via email footer link
 */
export class NotificationPreferenceEntity extends BaseEntity<NotificationPreferenceEntity> {
  // ============================================
  // Private Properties
  // ============================================

  private _userId: string;
  private _emailEnabled: boolean;
  private _smsEnabled: boolean;
  private _marketingEnabled: boolean;
  private _eventRemindersEnabled: boolean;
  private _unsubscribeToken: string;

  // ============================================
  // Constructor
  // ============================================

  private constructor(props: PreferenceProps) {
    super(props.id, props.createdAt);
    this._userId = props.userId;
    this._emailEnabled = props.emailEnabled;
    this._smsEnabled = props.smsEnabled;
    this._marketingEnabled = props.marketingEnabled;
    this._eventRemindersEnabled = props.eventRemindersEnabled;
    this._unsubscribeToken = props.unsubscribeToken;
    this._updatedAt = props.updatedAt;
  }

  // ============================================
  // Getters
  // ============================================

  get userId(): string {
    return this._userId;
  }

  get emailEnabled(): boolean {
    return this._emailEnabled;
  }

  get smsEnabled(): boolean {
    return this._smsEnabled;
  }

  get marketingEnabled(): boolean {
    return this._marketingEnabled;
  }

  get eventRemindersEnabled(): boolean {
    return this._eventRemindersEnabled;
  }

  get unsubscribeToken(): string {
    return this._unsubscribeToken;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Check if the user can receive a given notification type on a given channel
   */
  canReceive(type: NotificationType, channel: 'EMAIL' | 'SMS'): boolean {
    // Transactional notifications always allowed
    if (isTransactionalType(type)) {
      return true;
    }

    // Check channel-level preference
    if (channel === 'EMAIL' && !this._emailEnabled) return false;
    if (channel === 'SMS' && !this._smsEnabled) return false;

    // Check category-level preference
    if (isMarketingType(type) && !this._marketingEnabled) return false;
    if (isReminderType(type) && !this._eventRemindersEnabled) return false;

    return true;
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create default preferences for a new user
   */
  static create(
    props: CreatePreferenceProps,
  ): Result<NotificationPreferenceEntity, Error> {
    if (!props.userId || !isUUID(props.userId)) {
      return Result.fail(new Error('User ID must be a valid UUID'));
    }

    const id = props.id || generateUUID();
    const now = new Date();

    const preference = new NotificationPreferenceEntity({
      id,
      userId: props.userId,
      emailEnabled: props.emailEnabled ?? true,
      smsEnabled: props.smsEnabled ?? true,
      marketingEnabled: props.marketingEnabled ?? false,
      eventRemindersEnabled: props.eventRemindersEnabled ?? true,
      unsubscribeToken: NotificationPreferenceEntity.generateToken(),
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(preference);
  }

  /**
   * Reconstitute from persistence (no validation, no events)
   */
  static reconstitute(
    props: PreferenceProps,
  ): NotificationPreferenceEntity {
    return new NotificationPreferenceEntity(props);
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Update notification preferences
   */
  updatePreferences(updates: PreferenceUpdates): void {
    const changes: Record<string, { before: boolean; after: boolean }> = {};

    if (
      updates.emailEnabled !== undefined &&
      updates.emailEnabled !== this._emailEnabled
    ) {
      changes['emailEnabled'] = {
        before: this._emailEnabled,
        after: updates.emailEnabled,
      };
      this._emailEnabled = updates.emailEnabled;
    }

    if (
      updates.smsEnabled !== undefined &&
      updates.smsEnabled !== this._smsEnabled
    ) {
      changes['smsEnabled'] = {
        before: this._smsEnabled,
        after: updates.smsEnabled,
      };
      this._smsEnabled = updates.smsEnabled;
    }

    if (
      updates.marketingEnabled !== undefined &&
      updates.marketingEnabled !== this._marketingEnabled
    ) {
      changes['marketingEnabled'] = {
        before: this._marketingEnabled,
        after: updates.marketingEnabled,
      };
      this._marketingEnabled = updates.marketingEnabled;
    }

    if (
      updates.eventRemindersEnabled !== undefined &&
      updates.eventRemindersEnabled !== this._eventRemindersEnabled
    ) {
      changes['eventRemindersEnabled'] = {
        before: this._eventRemindersEnabled,
        after: updates.eventRemindersEnabled,
      };
      this._eventRemindersEnabled = updates.eventRemindersEnabled;
    }

    if (Object.keys(changes).length > 0) {
      this.touch();
      this.addDomainEvent(
        new PreferencesUpdatedEvent(this._userId, changes),
      );
    }
  }

  /**
   * Unsubscribe from a category via email link
   */
  unsubscribe(
    category: 'marketing' | 'event_reminders',
  ): Result<void, PreferenceNotAllowedException> {
    switch (category) {
      case 'marketing':
        this._marketingEnabled = false;
        break;
      case 'event_reminders':
        this._eventRemindersEnabled = false;
        break;
      default:
        return Result.fail(
          PreferenceNotAllowedException.cannotDisableTransactional(),
        );
    }

    this.touch();
    this.addDomainEvent(
      new UserUnsubscribedEvent(this._userId, category),
    );

    return Result.okVoid();
  }

  /**
   * Regenerate the unsubscribe token
   */
  regenerateUnsubscribeToken(): string {
    this._unsubscribeToken =
      NotificationPreferenceEntity.generateToken();
    this.touch();
    return this._unsubscribeToken;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // ============================================
  // BaseEntity Implementations
  // ============================================

  clone(): NotificationPreferenceEntity {
    return new NotificationPreferenceEntity({
      id: this._id,
      userId: this._userId,
      emailEnabled: this._emailEnabled,
      smsEnabled: this._smsEnabled,
      marketingEnabled: this._marketingEnabled,
      eventRemindersEnabled: this._eventRemindersEnabled,
      unsubscribeToken: this._unsubscribeToken,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    });
  }

  validate(): void {
    if (!this._userId) {
      throw new Error('User ID is required for notification preferences');
    }
  }
}
