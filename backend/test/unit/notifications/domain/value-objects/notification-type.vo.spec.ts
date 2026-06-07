/**
 * @file Notification Type Value Object Unit Tests
 */

import {
  NotificationType,
  isTransactionalType,
  isMarketingType,
  isReminderType,
} from '@modules/notifications/domain/value-objects/notification-type.vo';

describe('NotificationType', () => {
  // ============================================
  // Enum Values
  // ============================================

  describe('Enum Values', () => {
    it('should have all expected types', () => {
      expect(NotificationType.ORDER_CONFIRMATION).toBe('ORDER_CONFIRMATION');
      expect(NotificationType.PASSWORD_RESET).toBe('PASSWORD_RESET');
      expect(NotificationType.EVENT_REMINDER).toBe('EVENT_REMINDER');
      expect(NotificationType.MARKETING_PROMO).toBe('MARKETING_PROMO');
      expect(NotificationType.ACCOUNT_UPDATE).toBe('ACCOUNT_UPDATE');
      expect(NotificationType.SECURITY_ALERT).toBe('SECURITY_ALERT');
      expect(NotificationType.EVENT_CANCELLED).toBe('EVENT_CANCELLED');
      expect(NotificationType.TICKET_CONFIRMED).toBe('TICKET_CONFIRMED');
      expect(NotificationType.WELCOME).toBe('WELCOME');
    });
  });

  // ============================================
  // isTransactionalType()
  // ============================================

  describe('isTransactionalType()', () => {
    const transactionalTypes = [
      NotificationType.ORDER_CONFIRMATION,
      NotificationType.PASSWORD_RESET,
      NotificationType.ACCOUNT_UPDATE,
      NotificationType.SECURITY_ALERT,
      NotificationType.TICKET_CONFIRMED,
      NotificationType.WELCOME,
    ];

    it.each(transactionalTypes)('%s is transactional', (type) => {
      expect(isTransactionalType(type)).toBe(true);
    });

    it('MARKETING_PROMO is not transactional', () => {
      expect(isTransactionalType(NotificationType.MARKETING_PROMO)).toBe(false);
    });

    it('EVENT_REMINDER is not transactional', () => {
      expect(isTransactionalType(NotificationType.EVENT_REMINDER)).toBe(false);
    });

    it('EVENT_CANCELLED is not transactional', () => {
      expect(isTransactionalType(NotificationType.EVENT_CANCELLED)).toBe(false);
    });
  });

  // ============================================
  // isMarketingType()
  // ============================================

  describe('isMarketingType()', () => {
    it('MARKETING_PROMO is marketing', () => {
      expect(isMarketingType(NotificationType.MARKETING_PROMO)).toBe(true);
    });

    it('ORDER_CONFIRMATION is not marketing', () => {
      expect(isMarketingType(NotificationType.ORDER_CONFIRMATION)).toBe(false);
    });

    it('EVENT_REMINDER is not marketing', () => {
      expect(isMarketingType(NotificationType.EVENT_REMINDER)).toBe(false);
    });
  });

  // ============================================
  // isReminderType()
  // ============================================

  describe('isReminderType()', () => {
    it('EVENT_REMINDER is a reminder', () => {
      expect(isReminderType(NotificationType.EVENT_REMINDER)).toBe(true);
    });

    it('EVENT_CANCELLED is a reminder', () => {
      expect(isReminderType(NotificationType.EVENT_CANCELLED)).toBe(true);
    });

    it('ORDER_CONFIRMATION is not a reminder', () => {
      expect(isReminderType(NotificationType.ORDER_CONFIRMATION)).toBe(false);
    });

    it('MARKETING_PROMO is not a reminder', () => {
      expect(isReminderType(NotificationType.MARKETING_PROMO)).toBe(false);
    });
  });
});
