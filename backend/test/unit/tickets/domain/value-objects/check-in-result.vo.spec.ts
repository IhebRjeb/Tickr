/**
 * @file CheckIn Result Value Object Unit Tests
 */

import { CheckInResultVO } from '@modules/tickets/domain';

describe('CheckInResultVO', () => {
  const ticketId = '550e8400-e29b-41d4-a716-446655440001';

  // ============================================
  // success()
  // ============================================

  describe('success()', () => {
    it('should create a successful check-in result', () => {
      const now = new Date();
      const result = CheckInResultVO.success(ticketId, 'John Doe', 'VIP', now);

      expect(result.isValid).toBe(true);
      expect(result.ticketId).toBe(ticketId);
      expect(result.holderName).toBe('John Doe');
      expect(result.ticketTypeName).toBe('VIP');
      expect(result.checkedInAt).toBe(now);
      expect(result.failureReason).toBeNull();
    });
  });

  // ============================================
  // failure()
  // ============================================

  describe('failure()', () => {
    it('should create a failed check-in result', () => {
      const result = CheckInResultVO.failure(
        ticketId,
        'John Doe',
        'Standard',
        'Ticket already checked in',
      );

      expect(result.isValid).toBe(false);
      expect(result.ticketId).toBe(ticketId);
      expect(result.holderName).toBe('John Doe');
      expect(result.ticketTypeName).toBe('Standard');
      expect(result.checkedInAt).toBeNull();
      expect(result.failureReason).toBe('Ticket already checked in');
    });
  });
});
