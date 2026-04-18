/**
 * @file Notification Status Value Object Unit Tests
 */

import {
  NotificationStatus,
  isValidNotificationTransition,
  isTerminalNotificationStatus,
} from '@modules/notifications/domain/value-objects/notification-status.vo';

describe('NotificationStatus', () => {
  // ============================================
  // Enum Values
  // ============================================

  describe('Enum Values', () => {
    it('should have all expected statuses', () => {
      expect(NotificationStatus.PENDING).toBe('PENDING');
      expect(NotificationStatus.SENDING).toBe('SENDING');
      expect(NotificationStatus.SENT).toBe('SENT');
      expect(NotificationStatus.DELIVERED).toBe('DELIVERED');
      expect(NotificationStatus.FAILED).toBe('FAILED');
    });
  });

  // ============================================
  // isValidNotificationTransition()
  // ============================================

  describe('isValidNotificationTransition()', () => {
    // PENDING transitions
    it('PENDING → SENDING is valid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.PENDING,
          NotificationStatus.SENDING,
        ),
      ).toBe(true);
    });

    it('PENDING → FAILED is valid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.PENDING,
          NotificationStatus.FAILED,
        ),
      ).toBe(true);
    });

    it('PENDING → SENT is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.PENDING,
          NotificationStatus.SENT,
        ),
      ).toBe(false);
    });

    it('PENDING → DELIVERED is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.PENDING,
          NotificationStatus.DELIVERED,
        ),
      ).toBe(false);
    });

    // SENDING transitions
    it('SENDING → SENT is valid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.SENDING,
          NotificationStatus.SENT,
        ),
      ).toBe(true);
    });

    it('SENDING → FAILED is valid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.SENDING,
          NotificationStatus.FAILED,
        ),
      ).toBe(true);
    });

    it('SENDING → PENDING is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.SENDING,
          NotificationStatus.PENDING,
        ),
      ).toBe(false);
    });

    it('SENDING → DELIVERED is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.SENDING,
          NotificationStatus.DELIVERED,
        ),
      ).toBe(false);
    });

    // SENT transitions
    it('SENT → DELIVERED is valid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.SENT,
          NotificationStatus.DELIVERED,
        ),
      ).toBe(true);
    });

    it('SENT → FAILED is valid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.SENT,
          NotificationStatus.FAILED,
        ),
      ).toBe(true);
    });

    it('SENT → PENDING is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.SENT,
          NotificationStatus.PENDING,
        ),
      ).toBe(false);
    });

    // DELIVERED transitions (terminal)
    it('DELIVERED → any is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.DELIVERED,
          NotificationStatus.PENDING,
        ),
      ).toBe(false);
      expect(
        isValidNotificationTransition(
          NotificationStatus.DELIVERED,
          NotificationStatus.FAILED,
        ),
      ).toBe(false);
      expect(
        isValidNotificationTransition(
          NotificationStatus.DELIVERED,
          NotificationStatus.SENDING,
        ),
      ).toBe(false);
    });

    // FAILED transitions (retry)
    it('FAILED → PENDING is valid (retry)', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.FAILED,
          NotificationStatus.PENDING,
        ),
      ).toBe(true);
    });

    it('FAILED → SENDING is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.FAILED,
          NotificationStatus.SENDING,
        ),
      ).toBe(false);
    });

    it('FAILED → SENT is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.FAILED,
          NotificationStatus.SENT,
        ),
      ).toBe(false);
    });

    it('FAILED → DELIVERED is invalid', () => {
      expect(
        isValidNotificationTransition(
          NotificationStatus.FAILED,
          NotificationStatus.DELIVERED,
        ),
      ).toBe(false);
    });
  });

  // ============================================
  // isTerminalNotificationStatus()
  // ============================================

  describe('isTerminalNotificationStatus()', () => {
    it('DELIVERED is terminal', () => {
      expect(isTerminalNotificationStatus(NotificationStatus.DELIVERED)).toBe(
        true,
      );
    });

    it('PENDING is not terminal', () => {
      expect(isTerminalNotificationStatus(NotificationStatus.PENDING)).toBe(
        false,
      );
    });

    it('SENDING is not terminal', () => {
      expect(isTerminalNotificationStatus(NotificationStatus.SENDING)).toBe(
        false,
      );
    });

    it('SENT is not terminal', () => {
      expect(isTerminalNotificationStatus(NotificationStatus.SENT)).toBe(
        false,
      );
    });

    it('FAILED is not terminal (can retry)', () => {
      expect(isTerminalNotificationStatus(NotificationStatus.FAILED)).toBe(
        false,
      );
    });
  });
});
