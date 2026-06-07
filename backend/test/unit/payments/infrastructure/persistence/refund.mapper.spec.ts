import { RefundEntity } from '@modules/payments/domain/entities/refund.entity';
import { RefundStatus } from '@modules/payments/domain/value-objects/refund-status.vo';
import { RefundOrmEntity } from '@modules/payments/infrastructure/persistence/entities/refund.orm-entity';
import { RefundMapper } from '@modules/payments/infrastructure/persistence/mappers/refund.mapper';

describe('RefundMapper', () => {
  let mapper: RefundMapper;

  beforeEach(() => {
    mapper = new RefundMapper();
  });

  function createDomainRefund(): RefundEntity {
    return RefundEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440030',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      amountValue: 100,
      amountCurrency: 'TND',
      reason: 'Event cancelled',
      status: RefundStatus.COMPLETED,
      gatewayRefundId: 're_789',
      processedAt: new Date('2026-01-02T10:00:00Z'),
      createdAt: new Date('2026-01-02T09:00:00Z'),
    });
  }

  function createOrmRefund(): RefundOrmEntity {
    const entity = new RefundOrmEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440030';
    entity.orderId = '550e8400-e29b-41d4-a716-446655440000';
    entity.amountValue = 100;
    entity.amountCurrency = 'TND';
    entity.reason = 'Event cancelled';
    entity.status = RefundStatus.COMPLETED;
    entity.gatewayRefundId = 're_789';
    entity.processedAt = new Date('2026-01-02T10:00:00Z');
    entity.createdAt = new Date('2026-01-02T09:00:00Z');
    return entity;
  }

  describe('toPersistence', () => {
    it('should convert domain refund to ORM entity', () => {
      const domain = createDomainRefund();
      const orm = mapper.toPersistence(domain);

      expect(orm.id).toBe('550e8400-e29b-41d4-a716-446655440030');
      expect(orm.orderId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(orm.amountValue).toBe(100);
      expect(orm.amountCurrency).toBe('TND');
      expect(orm.reason).toBe('Event cancelled');
      expect(orm.status).toBe(RefundStatus.COMPLETED);
      expect(orm.gatewayRefundId).toBe('re_789');
      expect(orm.processedAt).toEqual(new Date('2026-01-02T10:00:00Z'));
    });
  });

  describe('toDomain', () => {
    it('should convert ORM entity to domain refund', () => {
      const orm = createOrmRefund();
      const domain = mapper.toDomain(orm);

      expect(domain.id).toBe('550e8400-e29b-41d4-a716-446655440030');
      expect(domain.orderId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(domain.amountValue).toBe(100);
      expect(domain.reason).toBe('Event cancelled');
      expect(domain.status).toBe(RefundStatus.COMPLETED);
      expect(domain.gatewayRefundId).toBe('re_789');
    });

    it('should handle null gateway refund id', () => {
      const orm = createOrmRefund();
      orm.gatewayRefundId = null;
      orm.processedAt = null;
      orm.status = RefundStatus.PENDING;

      const domain = mapper.toDomain(orm);

      expect(domain.gatewayRefundId).toBeNull();
      expect(domain.processedAt).toBeNull();
      expect(domain.status).toBe(RefundStatus.PENDING);
    });
  });

  describe('toDomainArray', () => {
    it('should convert array', () => {
      const orms = [createOrmRefund(), createOrmRefund()];
      const domains = mapper.toDomainArray(orms);
      expect(domains).toHaveLength(2);
    });
  });
});
