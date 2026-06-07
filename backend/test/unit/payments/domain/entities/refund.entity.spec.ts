
import { RefundEntity } from '@modules/payments/domain/entities/refund.entity';
import { RefundStatus } from '@modules/payments/domain/value-objects/refund-status.vo';
import { Money } from '@shared/domain/value-objects/money.vo';

describe('RefundEntity', () => {
  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';

  function createRefund() {
    return RefundEntity.create({
      orderId: validOrderId,
      amount: Money.create(96, 'TND'),
      reason: 'Event cancelled by organizer',
    });
  }

  describe('create', () => {
    it('should create a refund with PENDING status', () => {
      const refund = createRefund();

      expect(refund.id).toBeDefined();
      expect(refund.orderId).toBe(validOrderId);
      expect(refund.amountValue).toBe(96);
      expect(refund.amountCurrency).toBe('TND');
      expect(refund.reason).toBe('Event cancelled by organizer');
      expect(refund.status).toBe(RefundStatus.PENDING);
      expect(refund.gatewayRefundId).toBeNull();
      expect(refund.processedAt).toBeNull();
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const refund = createRefund();

      expect(refund.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('markAsCompleted', () => {
    it('should transition to COMPLETED with gateway refund ID', () => {
      const refund = createRefund();

      refund.markAsCompleted('re_stripe_123');

      expect(refund.status).toBe(RefundStatus.COMPLETED);
      expect(refund.isCompleted()).toBe(true);
      expect(refund.gatewayRefundId).toBe('re_stripe_123');
      expect(refund.processedAt).toBeInstanceOf(Date);
    });

    it('should work without gateway refund ID (manual refund)', () => {
      const refund = createRefund();

      refund.markAsCompleted();

      expect(refund.isCompleted()).toBe(true);
      expect(refund.gatewayRefundId).toBeNull();
      expect(refund.processedAt).toBeInstanceOf(Date);
    });
  });

  describe('markAsFailed', () => {
    it('should transition to FAILED', () => {
      const refund = createRefund();

      refund.markAsFailed('Gateway rejected refund');

      expect(refund.status).toBe(RefundStatus.FAILED);
      expect(refund.isFailed()).toBe(true);
    });
  });

  describe('query methods', () => {
    it('isPending returns true for new refund', () => {
      const refund = createRefund();
      expect(refund.isPending()).toBe(true);
    });

    it('amount returns Money VO', () => {
      const refund = createRefund();
      const amount = refund.amount;

      expect(amount.amount).toBe(96);
      expect(amount.currency).toBe('TND');
    });
  });

  describe('reconstitute', () => {
    it('should restore refund from persistence', () => {
      const processedAt = new Date('2026-01-15');
      const refund = RefundEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        orderId: validOrderId,
        amountValue: 150,
        amountCurrency: 'EUR',
        reason: 'Duplicate charge',
        status: RefundStatus.COMPLETED,
        gatewayRefundId: 're_abc',
        processedAt,
        createdAt: new Date('2026-01-10'),
      });

      expect(refund.id).toBe('550e8400-e29b-41d4-a716-446655440099');
      expect(refund.amountCurrency).toBe('EUR');
      expect(refund.isCompleted()).toBe(true);
      expect(refund.processedAt).toEqual(processedAt);
    });
  });
});
