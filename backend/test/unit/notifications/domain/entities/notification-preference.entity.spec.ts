/**
 * @file NotificationPreference Entity Unit Tests
 * @description Tests for notification preference management entity
 */

import {
  NotificationPreferenceEntity,
  NotificationType,
  PreferencesUpdatedEvent,
  UserUnsubscribedEvent,
} from '@modules/notifications/domain';

describe('NotificationPreferenceEntity', () => {
  // ============================================
  // Helper Functions
  // ============================================

  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  const createPreference = (
    overrides: Record<string, unknown> = {},
  ): NotificationPreferenceEntity => {
    const result = NotificationPreferenceEntity.create({
      userId: validUserId,
      ...overrides,
    });
    expect(result.isSuccess).toBe(true);
    return result.value;
  };

  const createReconstituted = (
    overrides: Record<string, unknown> = {},
  ): NotificationPreferenceEntity => {
    return NotificationPreferenceEntity.reconstitute({
      id: validUUID,
      userId: validUserId,
      emailEnabled: true,
      smsEnabled: true,
      marketingEnabled: false,
      eventRemindersEnabled: true,
      unsubscribeToken: 'a'.repeat(64),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  // ============================================
  // create()
  // ============================================

  describe('create()', () => {
    describe('Success Cases', () => {
      it('should create with default preferences', () => {
        const pref = createPreference();
        expect(pref.userId).toBe(validUserId);
        expect(pref.emailEnabled).toBe(true);
        expect(pref.smsEnabled).toBe(true);
        expect(pref.marketingEnabled).toBe(false);
        expect(pref.eventRemindersEnabled).toBe(true);
      });

      it('should generate unsubscribe token', () => {
        const pref = createPreference();
        expect(pref.unsubscribeToken).toBeDefined();
        expect(pref.unsubscribeToken.length).toBe(64);
      });

      it('should accept custom preferences', () => {
        const pref = createPreference({
          emailEnabled: false,
          marketingEnabled: true,
        });
        expect(pref.emailEnabled).toBe(false);
        expect(pref.marketingEnabled).toBe(true);
      });

      it('should generate unique IDs', () => {
        const p1 = createPreference();
        const p2 = createPreference();
        expect(p1.id).not.toBe(p2.id);
      });

      it('should generate unique unsubscribe tokens', () => {
        const p1 = createPreference();
        const p2 = createPreference();
        expect(p1.unsubscribeToken).not.toBe(p2.unsubscribeToken);
      });
    });

    describe('Validation Failures', () => {
      it('should fail with invalid userId', () => {
        const result = NotificationPreferenceEntity.create({
          userId: 'not-a-uuid',
        });
        expect(result.isFailure).toBe(true);
      });

      it('should fail with empty userId', () => {
        const result = NotificationPreferenceEntity.create({
          userId: '',
        });
        expect(result.isFailure).toBe(true);
      });
    });
  });

  // ============================================
  // reconstitute()
  // ============================================

  describe('reconstitute()', () => {
    it('should reconstitute with all properties', () => {
      const pref = createReconstituted();
      expect(pref.id).toBe(validUUID);
      expect(pref.userId).toBe(validUserId);
      expect(pref.emailEnabled).toBe(true);
    });

    it('should not emit any domain events', () => {
      const pref = createReconstituted();
      expect(pref.domainEvents).toHaveLength(0);
    });
  });

  // ============================================
  // canReceive()
  // ============================================

  describe('canReceive()', () => {
    it('should always allow transactional types', () => {
      const pref = createReconstituted({
        emailEnabled: false,
        smsEnabled: false,
      });

      expect(
        pref.canReceive(NotificationType.ORDER_CONFIRMATION, 'EMAIL'),
      ).toBe(true);
      expect(
        pref.canReceive(NotificationType.PASSWORD_RESET, 'SMS'),
      ).toBe(true);
      expect(pref.canReceive(NotificationType.WELCOME, 'EMAIL')).toBe(true);
      expect(
        pref.canReceive(NotificationType.SECURITY_ALERT, 'EMAIL'),
      ).toBe(true);
      expect(
        pref.canReceive(NotificationType.TICKET_CONFIRMED, 'EMAIL'),
      ).toBe(true);
    });

    it('should block marketing when disabled', () => {
      const pref = createReconstituted({ marketingEnabled: false });
      expect(
        pref.canReceive(NotificationType.MARKETING_PROMO, 'EMAIL'),
      ).toBe(false);
    });

    it('should allow marketing when enabled', () => {
      const pref = createReconstituted({ marketingEnabled: true });
      expect(
        pref.canReceive(NotificationType.MARKETING_PROMO, 'EMAIL'),
      ).toBe(true);
    });

    it('should block reminders when disabled', () => {
      const pref = createReconstituted({ eventRemindersEnabled: false });
      expect(
        pref.canReceive(NotificationType.EVENT_REMINDER, 'EMAIL'),
      ).toBe(false);
    });

    it('should allow reminders when enabled', () => {
      const pref = createReconstituted({ eventRemindersEnabled: true });
      expect(
        pref.canReceive(NotificationType.EVENT_REMINDER, 'EMAIL'),
      ).toBe(true);
    });

    it('should block email channel when disabled', () => {
      const pref = createReconstituted({
        emailEnabled: false,
        marketingEnabled: true,
      });
      expect(
        pref.canReceive(NotificationType.MARKETING_PROMO, 'EMAIL'),
      ).toBe(false);
    });

    it('should block SMS channel when disabled', () => {
      const pref = createReconstituted({
        smsEnabled: false,
        eventRemindersEnabled: true,
      });
      expect(
        pref.canReceive(NotificationType.EVENT_REMINDER, 'SMS'),
      ).toBe(false);
    });
  });

  // ============================================
  // updatePreferences()
  // ============================================

  describe('updatePreferences()', () => {
    it('should update email preference', () => {
      const pref = createPreference();
      pref.updatePreferences({ emailEnabled: false });
      expect(pref.emailEnabled).toBe(false);
    });

    it('should update multiple preferences at once', () => {
      const pref = createPreference();
      pref.updatePreferences({
        emailEnabled: false,
        smsEnabled: false,
        marketingEnabled: true,
      });
      expect(pref.emailEnabled).toBe(false);
      expect(pref.smsEnabled).toBe(false);
      expect(pref.marketingEnabled).toBe(true);
    });

    it('should emit PreferencesUpdatedEvent when changes occur', () => {
      const pref = createPreference();
      // Clear creation events
      pref.pullDomainEvents();

      pref.updatePreferences({ emailEnabled: false });
      const events = pref.domainEvents;
      const updatedEvent = events.find(
        (e): e is PreferencesUpdatedEvent =>
          e instanceof PreferencesUpdatedEvent,
      );
      expect(updatedEvent).toBeDefined();
    });

    it('should not emit event when no changes occur', () => {
      const pref = createPreference();
      pref.pullDomainEvents();

      pref.updatePreferences({ emailEnabled: true }); // same value
      expect(pref.domainEvents).toHaveLength(0);
    });

    it('should track changes in event payload', () => {
      const pref = createPreference();
      pref.pullDomainEvents();

      pref.updatePreferences({ emailEnabled: false });
      const events = pref.domainEvents;
      const updatedEvent = events.find(
        (e): e is PreferencesUpdatedEvent =>
          e instanceof PreferencesUpdatedEvent,
      );
      expect(updatedEvent!.changes).toHaveProperty('emailEnabled');
      expect(updatedEvent!.changes['emailEnabled']).toEqual({
        before: true,
        after: false,
      });
    });
  });

  // ============================================
  // unsubscribe()
  // ============================================

  describe('unsubscribe()', () => {
    it('should unsubscribe from marketing', () => {
      const pref = createReconstituted({ marketingEnabled: true });

      const result = pref.unsubscribe('marketing');
      expect(result.isSuccess).toBe(true);
      expect(pref.marketingEnabled).toBe(false);
    });

    it('should unsubscribe from event_reminders', () => {
      const pref = createReconstituted({ eventRemindersEnabled: true });

      const result = pref.unsubscribe('event_reminders');
      expect(result.isSuccess).toBe(true);
      expect(pref.eventRemindersEnabled).toBe(false);
    });

    it('should emit UserUnsubscribedEvent', () => {
      const pref = createReconstituted({ marketingEnabled: true });

      pref.unsubscribe('marketing');
      const events = pref.domainEvents;
      const unsubEvent = events.find(
        (e): e is UserUnsubscribedEvent =>
          e instanceof UserUnsubscribedEvent,
      );
      expect(unsubEvent).toBeDefined();
      expect(unsubEvent!.category).toBe('marketing');
    });
  });

  // ============================================
  // regenerateUnsubscribeToken()
  // ============================================

  describe('regenerateUnsubscribeToken()', () => {
    it('should generate a new token', () => {
      const pref = createPreference();
      const oldToken = pref.unsubscribeToken;

      const newToken = pref.regenerateUnsubscribeToken();
      expect(newToken).not.toBe(oldToken);
      expect(newToken.length).toBe(64);
      expect(pref.unsubscribeToken).toBe(newToken);
    });
  });

  // ============================================
  // clone()
  // ============================================

  describe('clone()', () => {
    it('should create an independent copy', () => {
      const pref = createPreference();
      const clone = pref.clone();

      expect(clone.id).toBe(pref.id);
      expect(clone.userId).toBe(pref.userId);
      expect(clone).not.toBe(pref);
    });
  });
});
