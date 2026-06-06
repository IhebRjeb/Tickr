import {
  OrderStatus,
  isValidOrderTransition,
  isTerminalOrderStatus,
  getAllowedTransitions,
} from '@modules/payments/domain/value-objects/order-status.vo';

describe('OrderStatus Value Object', () => {
  describe('isValidOrderTransition', () => {
    it('should allow PENDING → PROCESSING', () => {
      expect(isValidOrderTransition(OrderStatus.PENDING, OrderStatus.PROCESSING)).toBe(true);
    });

    it('should allow PENDING → CANCELLED', () => {
      expect(isValidOrderTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
    });

    it('should allow PROCESSING → PAID', () => {
      expect(isValidOrderTransition(OrderStatus.PROCESSING, OrderStatus.PAID)).toBe(true);
    });

    it('should allow PROCESSING → FAILED', () => {
      expect(isValidOrderTransition(OrderStatus.PROCESSING, OrderStatus.FAILED)).toBe(true);
    });

    it('should allow PROCESSING → CANCELLED', () => {
      expect(isValidOrderTransition(OrderStatus.PROCESSING, OrderStatus.CANCELLED)).toBe(true);
    });

    it('should allow PAID → REFUNDED', () => {
      expect(isValidOrderTransition(OrderStatus.PAID, OrderStatus.REFUNDED)).toBe(true);
    });

    it('should NOT allow PENDING → PAID (skip processing)', () => {
      expect(isValidOrderTransition(OrderStatus.PENDING, OrderStatus.PAID)).toBe(false);
    });

    it('should NOT allow PAID → PENDING (backward)', () => {
      expect(isValidOrderTransition(OrderStatus.PAID, OrderStatus.PENDING)).toBe(false);
    });

    it('should NOT allow FAILED → anything', () => {
      expect(isValidOrderTransition(OrderStatus.FAILED, OrderStatus.PENDING)).toBe(false);
      expect(isValidOrderTransition(OrderStatus.FAILED, OrderStatus.PAID)).toBe(false);
    });

    it('should NOT allow CANCELLED → anything', () => {
      expect(isValidOrderTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
      expect(isValidOrderTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(false);
    });

    it('should NOT allow REFUNDED → anything', () => {
      expect(isValidOrderTransition(OrderStatus.REFUNDED, OrderStatus.PENDING)).toBe(false);
      expect(isValidOrderTransition(OrderStatus.REFUNDED, OrderStatus.PAID)).toBe(false);
    });
  });

  describe('isTerminalOrderStatus', () => {
    it('should identify FAILED as terminal', () => {
      expect(isTerminalOrderStatus(OrderStatus.FAILED)).toBe(true);
    });

    it('should identify CANCELLED as terminal', () => {
      expect(isTerminalOrderStatus(OrderStatus.CANCELLED)).toBe(true);
    });

    it('should identify REFUNDED as terminal', () => {
      expect(isTerminalOrderStatus(OrderStatus.REFUNDED)).toBe(true);
    });

    it('should NOT identify PENDING as terminal', () => {
      expect(isTerminalOrderStatus(OrderStatus.PENDING)).toBe(false);
    });

    it('should NOT identify PROCESSING as terminal', () => {
      expect(isTerminalOrderStatus(OrderStatus.PROCESSING)).toBe(false);
    });

    it('should NOT identify PAID as terminal (can be refunded)', () => {
      expect(isTerminalOrderStatus(OrderStatus.PAID)).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return [PROCESSING, CANCELLED] for PENDING', () => {
      const allowed = getAllowedTransitions(OrderStatus.PENDING);
      expect(allowed).toEqual([OrderStatus.PROCESSING, OrderStatus.CANCELLED]);
    });

    it('should return empty array for terminal states', () => {
      expect(getAllowedTransitions(OrderStatus.FAILED)).toEqual([]);
      expect(getAllowedTransitions(OrderStatus.CANCELLED)).toEqual([]);
      expect(getAllowedTransitions(OrderStatus.REFUNDED)).toEqual([]);
    });
  });
});
