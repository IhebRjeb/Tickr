import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { PaymentStatus } from '@modules/payments/domain/value-objects/payment-status.vo';
import { PaymentOrmEntity } from '@modules/payments/infrastructure/persistence/entities/payment.orm-entity';
import { PaymentMapper } from '@modules/payments/infrastructure/persistence/mappers/payment.mapper';

describe('PaymentMapper', () => {
  let mapper: PaymentMapper;

  beforeEach(() => {
    mapper = new PaymentMapper();
  });

  function createDomainPayment(): PaymentEntity {
    return PaymentEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440010',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      amountValue: 106,
      amountCurrency: 'TND',
      provider: PaymentMethod.STRIPE,
      status: PaymentStatus.SUCCESS,
      gatewayResponse: { status: 'succeeded' },
      gatewayPaymentRef: 'pi_123',
      paymentUrl: null,
      clientSecret: null,
      errorCode: null,
      errorMessage: null,
      attemptNumber: 1,
      createdAt: new Date('2026-01-01T12:00:00Z'),
    });
  }

  function createOrmPayment(): PaymentOrmEntity {
    const entity = new PaymentOrmEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440010';
    entity.orderId = '550e8400-e29b-41d4-a716-446655440000';
    entity.amountValue = 106;
    entity.amountCurrency = 'TND';
    entity.provider = PaymentMethod.STRIPE;
    entity.status = PaymentStatus.SUCCESS;
    entity.gatewayResponse = { status: 'succeeded' };
    entity.gatewayPaymentRef = 'pi_123';
    entity.errorCode = null;
    entity.errorMessage = null;
    entity.attemptNumber = 1;
    entity.createdAt = new Date('2026-01-01T12:00:00Z');
    return entity;
  }

  describe('toPersistence', () => {
    it('should convert domain payment to ORM entity', () => {
      const domain = createDomainPayment();
      const orm = mapper.toPersistence(domain);

      expect(orm.id).toBe('550e8400-e29b-41d4-a716-446655440010');
      expect(orm.orderId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(orm.amountValue).toBe(106);
      expect(orm.amountCurrency).toBe('TND');
      expect(orm.provider).toBe(PaymentMethod.STRIPE);
      expect(orm.status).toBe(PaymentStatus.SUCCESS);
      expect(orm.gatewayResponse).toEqual({ status: 'succeeded' });
      expect(orm.gatewayPaymentRef).toBe('pi_123');
      expect(orm.attemptNumber).toBe(1);
    });
  });

  describe('toDomain', () => {
    it('should convert ORM entity to domain payment', () => {
      const orm = createOrmPayment();
      const domain = mapper.toDomain(orm);

      expect(domain.id).toBe('550e8400-e29b-41d4-a716-446655440010');
      expect(domain.orderId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(domain.amountValue).toBe(106);
      expect(domain.provider).toBe(PaymentMethod.STRIPE);
      expect(domain.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should handle decimal string conversion', () => {
      const orm = createOrmPayment();
      (orm as any).amountValue = '106.500';

      const domain = mapper.toDomain(orm);
      expect(domain.amountValue).toBe(106.5);
    });
  });

  describe('toDomainArray', () => {
    it('should convert array', () => {
      const orms = [createOrmPayment(), createOrmPayment()];
      const domains = mapper.toDomainArray(orms);
      expect(domains).toHaveLength(2);
    });
  });
});
