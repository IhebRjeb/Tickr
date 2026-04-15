/**
 * @file Domain Exceptions Unit Tests
 * @description Tests for static factory methods of ticket domain exceptions
 */

import { CheckInOutsideWindowException } from '@modules/tickets/domain/exceptions/check-in-outside-window.exception';
import { InvalidCheckInException } from '@modules/tickets/domain/exceptions/invalid-check-in.exception';
import { InvalidTicketException } from '@modules/tickets/domain/exceptions/invalid-ticket.exception';
import { MaxTransfersReachedException } from '@modules/tickets/domain/exceptions/max-transfers-reached.exception';
import { TicketAlreadyCheckedInException } from '@modules/tickets/domain/exceptions/ticket-already-checked-in.exception';
import { TicketExpiredException } from '@modules/tickets/domain/exceptions/ticket-expired.exception';

describe('Domain Exceptions', () => {
  describe('CheckInOutsideWindowException', () => {
    it('should create tooEarly exception', () => {
      const ex = CheckInOutsideWindowException.tooEarly(new Date('2026-07-15T20:00:00Z'), 2);
      expect(ex.message).toContain('opens 2 hour(s) before event start');
      expect(ex.code).toBe('CHECK_IN_OUTSIDE_WINDOW');
    });

    it('should create tooLate exception', () => {
      const ex = CheckInOutsideWindowException.tooLate(new Date('2026-07-15T23:00:00Z'));
      expect(ex.message).toContain('event ended at');
      expect(ex.code).toBe('CHECK_IN_OUTSIDE_WINDOW');
    });

    it('should create eventNotStarted exception', () => {
      const ex = CheckInOutsideWindowException.eventNotStarted('event-123');
      expect(ex.message).toContain('event event-123');
    });
  });

  describe('InvalidCheckInException', () => {
    it('should create missingTicketId', () => {
      const ex = InvalidCheckInException.missingTicketId();
      expect(ex.message).toContain('ticket ID');
    });

    it('should create missingEventId', () => {
      const ex = InvalidCheckInException.missingEventId();
      expect(ex.message).toContain('event ID');
    });

    it('should create missingStaffId', () => {
      const ex = InvalidCheckInException.missingStaffId();
      expect(ex.message).toContain('staff ID');
    });

    it('should create missingDeviceId', () => {
      const ex = InvalidCheckInException.missingDeviceId();
      expect(ex.message).toContain('device ID');
    });

    it('should create missingLocationGate', () => {
      const ex = InvalidCheckInException.missingLocationGate();
      expect(ex.message).toContain('location gate');
    });

    it('should create invalidUUID', () => {
      const ex = InvalidCheckInException.invalidUUID('staffId');
      expect(ex.message).toContain('staffId must be a valid UUID');
    });
  });

  describe('InvalidTicketException', () => {
    it('should create holderNameTooLong', () => {
      const ex = InvalidTicketException.holderNameTooLong(200);
      expect(ex.message).toContain('200 characters');
    });

    it('should create missingEventId', () => {
      const ex = InvalidTicketException.missingEventId();
      expect(ex.message).toContain('Event ID');
    });

    it('should create missingTicketTypeId', () => {
      const ex = InvalidTicketException.missingTicketTypeId();
      expect(ex.message).toContain('Ticket type ID');
    });

    it('should create missingUserId', () => {
      const ex = InvalidTicketException.missingUserId();
      expect(ex.message).toContain('User ID');
    });

    it('should create missingReservedUntil', () => {
      const ex = InvalidTicketException.missingReservedUntil();
      expect(ex.message).toContain('Reservation expiry');
    });

    it('should create invalidPrice', () => {
      const ex = InvalidTicketException.invalidPrice();
      expect(ex.message).toContain('non-negative');
    });
  });

  describe('MaxTransfersReachedException', () => {
    it('should create forTicket', () => {
      const ex = MaxTransfersReachedException.forTicket('ticket-123', 3);
      expect(ex.message).toContain('ticket-123');
      expect(ex.message).toContain('3 transfers');
      expect(ex.code).toBe('MAX_TRANSFERS_REACHED');
    });
  });

  describe('TicketAlreadyCheckedInException', () => {
    it('should create withTimestamp', () => {
      const date = new Date('2026-07-15T19:30:00Z');
      const ex = TicketAlreadyCheckedInException.withTimestamp('ticket-123', date);
      expect(ex.message).toContain('ticket-123');
      expect(ex.message).toContain('2026-07-15');
    });

    it('should create duplicateAttempt', () => {
      const ex = TicketAlreadyCheckedInException.duplicateAttempt('ticket-123');
      expect(ex.message).toContain('Duplicate check-in');
      expect(ex.code).toBe('TICKET_ALREADY_CHECKED_IN');
    });
  });

  describe('TicketExpiredException', () => {
    it('should create reservationExpired', () => {
      const date = new Date('2026-03-28T15:15:00Z');
      const ex = TicketExpiredException.reservationExpired('ticket-123', date);
      expect(ex.message).toContain('ticket-123');
      expect(ex.message).toContain('expired at');
    });

    it('should create cannotOperate', () => {
      const ex = TicketExpiredException.cannotOperate('ticket-123', 'confirm');
      expect(ex.message).toContain('Cannot confirm');
      expect(ex.code).toBe('TICKET_EXPIRED');
    });
  });
});
