/**
 * @file Notification Priority Value Object Unit Tests
 */

import {
  NotificationPriority,
  canBypassRateLimit,
} from '@modules/notifications/domain/value-objects/notification-priority.vo';

describe('NotificationPriority', () => {
  // ============================================
  // Enum Values
  // ============================================

  describe('Enum Values', () => {
    it('should have all expected priorities', () => {
      expect(NotificationPriority.HIGH).toBe('HIGH');
      expect(NotificationPriority.MEDIUM).toBe('MEDIUM');
      expect(NotificationPriority.LOW).toBe('LOW');
    });
  });

  // ============================================
  // canBypassRateLimit()
  // ============================================

  describe('canBypassRateLimit()', () => {
    it('HIGH can bypass rate limit', () => {
      expect(canBypassRateLimit(NotificationPriority.HIGH)).toBe(true);
    });

    it('MEDIUM cannot bypass rate limit', () => {
      expect(canBypassRateLimit(NotificationPriority.MEDIUM)).toBe(false);
    });

    it('LOW cannot bypass rate limit', () => {
      expect(canBypassRateLimit(NotificationPriority.LOW)).toBe(false);
    });
  });
});
