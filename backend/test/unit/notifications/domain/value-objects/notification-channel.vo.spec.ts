/**
 * @file Notification Channel Value Object Unit Tests
 */

import {
  NotificationChannel,
  isSupportedChannel,
} from '@modules/notifications/domain/value-objects/notification-channel.vo';

describe('NotificationChannel', () => {
  // ============================================
  // Enum Values
  // ============================================

  describe('Enum Values', () => {
    it('should have all expected channels', () => {
      expect(NotificationChannel.EMAIL).toBe('EMAIL');
      expect(NotificationChannel.SMS).toBe('SMS');
      expect(NotificationChannel.PUSH).toBe('PUSH');
    });
  });

  // ============================================
  // isSupportedChannel()
  // ============================================

  describe('isSupportedChannel()', () => {
    it('EMAIL is supported', () => {
      expect(isSupportedChannel(NotificationChannel.EMAIL)).toBe(true);
    });

    it('SMS is supported', () => {
      expect(isSupportedChannel(NotificationChannel.SMS)).toBe(true);
    });

    it('PUSH is not supported', () => {
      expect(isSupportedChannel(NotificationChannel.PUSH)).toBe(false);
    });
  });
});
