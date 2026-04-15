/**
 * @file Ticket Status Value Object Unit Tests
 */

import {
  TicketStatus,
  isValidTicketTransition,
  isTerminalTicketStatus,
} from '@modules/tickets/domain/value-objects/ticket-status.vo';

describe('TicketStatus', () => {
  // ============================================
  // Enum Values
  // ============================================

  describe('Enum Values', () => {
    it('should have all expected statuses', () => {
      expect(TicketStatus.RESERVED).toBe('RESERVED');
      expect(TicketStatus.CONFIRMED).toBe('CONFIRMED');
      expect(TicketStatus.CANCELLED).toBe('CANCELLED');
      expect(TicketStatus.CHECKED_IN).toBe('CHECKED_IN');
      expect(TicketStatus.EXPIRED).toBe('EXPIRED');
    });
  });

  // ============================================
  // isValidTicketTransition()
  // ============================================

  describe('isValidTicketTransition()', () => {
    // RESERVED transitions
    it('RESERVED → CONFIRMED is valid', () => {
      expect(isValidTicketTransition(TicketStatus.RESERVED, TicketStatus.CONFIRMED)).toBe(true);
    });

    it('RESERVED → CANCELLED is valid', () => {
      expect(isValidTicketTransition(TicketStatus.RESERVED, TicketStatus.CANCELLED)).toBe(true);
    });

    it('RESERVED → EXPIRED is valid', () => {
      expect(isValidTicketTransition(TicketStatus.RESERVED, TicketStatus.EXPIRED)).toBe(true);
    });

    it('RESERVED → CHECKED_IN is invalid', () => {
      expect(isValidTicketTransition(TicketStatus.RESERVED, TicketStatus.CHECKED_IN)).toBe(false);
    });

    // CONFIRMED transitions
    it('CONFIRMED → CHECKED_IN is valid', () => {
      expect(isValidTicketTransition(TicketStatus.CONFIRMED, TicketStatus.CHECKED_IN)).toBe(true);
    });

    it('CONFIRMED → CANCELLED is valid', () => {
      expect(isValidTicketTransition(TicketStatus.CONFIRMED, TicketStatus.CANCELLED)).toBe(true);
    });

    it('CONFIRMED → RESERVED is invalid', () => {
      expect(isValidTicketTransition(TicketStatus.CONFIRMED, TicketStatus.RESERVED)).toBe(false);
    });

    it('CONFIRMED → EXPIRED is invalid', () => {
      expect(isValidTicketTransition(TicketStatus.CONFIRMED, TicketStatus.EXPIRED)).toBe(false);
    });

    // Terminal states
    it('CHECKED_IN → any is invalid', () => {
      expect(isValidTicketTransition(TicketStatus.CHECKED_IN, TicketStatus.CONFIRMED)).toBe(false);
      expect(isValidTicketTransition(TicketStatus.CHECKED_IN, TicketStatus.CANCELLED)).toBe(false);
    });

    it('CANCELLED → any is invalid', () => {
      expect(isValidTicketTransition(TicketStatus.CANCELLED, TicketStatus.RESERVED)).toBe(false);
      expect(isValidTicketTransition(TicketStatus.CANCELLED, TicketStatus.CONFIRMED)).toBe(false);
    });

    it('EXPIRED → any is invalid', () => {
      expect(isValidTicketTransition(TicketStatus.EXPIRED, TicketStatus.RESERVED)).toBe(false);
      expect(isValidTicketTransition(TicketStatus.EXPIRED, TicketStatus.CONFIRMED)).toBe(false);
    });
  });

  // ============================================
  // isTerminalTicketStatus()
  // ============================================

  describe('isTerminalTicketStatus()', () => {
    it('CHECKED_IN is terminal', () => {
      expect(isTerminalTicketStatus(TicketStatus.CHECKED_IN)).toBe(true);
    });

    it('CANCELLED is terminal', () => {
      expect(isTerminalTicketStatus(TicketStatus.CANCELLED)).toBe(true);
    });

    it('EXPIRED is terminal', () => {
      expect(isTerminalTicketStatus(TicketStatus.EXPIRED)).toBe(true);
    });

    it('RESERVED is not terminal', () => {
      expect(isTerminalTicketStatus(TicketStatus.RESERVED)).toBe(false);
    });

    it('CONFIRMED is not terminal', () => {
      expect(isTerminalTicketStatus(TicketStatus.CONFIRMED)).toBe(false);
    });
  });
});
