/**
 * @file CheckIn Entity Unit Tests
 * @description Tests for CheckIn audit entity
 */

import { CheckInEntity } from '@modules/tickets/domain';

describe('CheckInEntity', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validTicketId = '550e8400-e29b-41d4-a716-446655440001';
  const validEventId = '550e8400-e29b-41d4-a716-446655440002';
  const validStaffId = '550e8400-e29b-41d4-a716-446655440003';

  const createValidProps = (overrides: Record<string, unknown> = {}) => ({
    ticketId: validTicketId,
    eventId: validEventId,
    staffId: validStaffId,
    deviceId: 'scanner-001',
    locationGate: 'Gate A',
    isValid: true,
    ...overrides,
  });

  // ============================================
  // create()
  // ============================================

  describe('create()', () => {
    describe('Success Cases', () => {
      it('should create a valid check-in entity', () => {
        const result = CheckInEntity.create(createValidProps());

        expect(result.isSuccess).toBe(true);
        const checkIn = result.value;
        expect(checkIn.ticketId).toBe(validTicketId);
        expect(checkIn.eventId).toBe(validEventId);
        expect(checkIn.staffId).toBe(validStaffId);
        expect(checkIn.deviceId).toBe('scanner-001');
        expect(checkIn.locationGate).toBe('Gate A');
      });

      it('should set isValid to true by default', () => {
        const result = CheckInEntity.create(createValidProps());
        expect(result.value.isValid).toBe(true);
      });

      it('should set timestamp to current time', () => {
        const before = new Date();
        const result = CheckInEntity.create(createValidProps());
        const after = new Date();

        expect(result.value.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.value.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should have null failureReason by default', () => {
        const result = CheckInEntity.create(createValidProps());
        expect(result.value.failureReason).toBeNull();
      });

      it('should generate unique IDs', () => {
        const r1 = CheckInEntity.create(createValidProps());
        const r2 = CheckInEntity.create(createValidProps());
        expect(r1.value.id).not.toBe(r2.value.id);
      });

      it('should accept isValid=false with failure reason', () => {
        const result = CheckInEntity.create(
          createValidProps({ isValid: false, failureReason: 'Ticket already used' }),
        );
        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.failureReason).toBe('Ticket already used');
      });
    });

    describe('Validation Failures', () => {
      it('should fail with invalid ticketId', () => {
        const result = CheckInEntity.create(createValidProps({ ticketId: 'bad' }));
        expect(result.isFailure).toBe(true);
      });

      it('should fail with empty ticketId', () => {
        const result = CheckInEntity.create(createValidProps({ ticketId: '' }));
        expect(result.isFailure).toBe(true);
      });

      it('should fail with invalid eventId', () => {
        const result = CheckInEntity.create(createValidProps({ eventId: 'nope' }));
        expect(result.isFailure).toBe(true);
      });

      it('should fail with invalid staffId', () => {
        const result = CheckInEntity.create(createValidProps({ staffId: '123' }));
        expect(result.isFailure).toBe(true);
      });

      it('should fail with empty deviceId', () => {
        const result = CheckInEntity.create(createValidProps({ deviceId: '' }));
        expect(result.isFailure).toBe(true);
      });

      it('should fail with empty locationGate', () => {
        const result = CheckInEntity.create(createValidProps({ locationGate: '' }));
        expect(result.isFailure).toBe(true);
      });
    });
  });

  // ============================================
  // markAsInvalid()
  // ============================================

  describe('markAsInvalid()', () => {
    it('should mark the check-in as invalid with a reason', () => {
      const checkIn = CheckInEntity.create(createValidProps()).value;
      expect(checkIn.isValid).toBe(true);

      checkIn.markAsInvalid('Ticket was cancelled');
      expect(checkIn.isValid).toBe(false);
      expect(checkIn.failureReason).toBe('Ticket was cancelled');
    });
  });

  // ============================================
  // reconstitute()
  // ============================================

  describe('reconstitute()', () => {
    it('should reconstitute from persistence', () => {
      const checkIn = CheckInEntity.reconstitute({
        id: validUUID,
        ticketId: validTicketId,
        eventId: validEventId,
        staffId: validStaffId,
        deviceId: 'scanner-002',
        locationGate: 'Gate B',
        timestamp: new Date('2026-04-01T10:00:00Z'),
        isValid: true,
        failureReason: null,
        createdAt: new Date('2026-04-01T10:00:00Z'),
      });

      expect(checkIn.id).toBe(validUUID);
      expect(checkIn.ticketId).toBe(validTicketId);
      expect(checkIn.deviceId).toBe('scanner-002');
    });
  });
});
