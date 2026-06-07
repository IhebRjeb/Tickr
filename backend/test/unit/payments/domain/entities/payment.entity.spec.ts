
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { PaymentStatus } from '@modules/payments/domain/value-objects/payment-status.vo';
import { Money } from '@shared/domain/value-objects/money.vo';

describe('PaymentEntity', () => {
  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';

  function createPayment() {
    return PaymentEntity.create({
      orderId: validOrderId,
      amount: Money.create(104, 'TND'),
      provider: PaymentMethod.KONNECT,
    });
  }

  describe('create', () => {
    it('should create a payment with PENDING status', () => {
      const payment = createPayment();

      expect(payment.id).toBeDefined();
      expect(payment.orderId).toBe(validOrderId);
      expect(payment.amountValue).toBe(104);
      expect(payment.amountCurrency).toBe('TND');
      expect(payment.provider).toBe(PaymentMethod.KONNECT);
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.attemptNumber).toBe(1);
      expect(payment.gatewayResponse).toBeNull();
      expect(payment.errorCode).toBeNull();
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const payment = createPayment();

      expect(payment.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('markAsSuccess', () => {
    it('should transition to SUCCESS with gateway response', () => {
      const payment = createPayment();
      const response = { transactionId: 'tx_123', status: 'completed' };

      payment.markAsSuccess(response, 'ref_abc');

      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.gatewayResponse).toEqual(response);
      expect(payment.gatewayPaymentRef).toBe('ref_abc');
    });

    it('should work without gateway ref', () => {
      const payment = createPayment();

      payment.markAsSuccess({ id: 'pi_123' });

      expect(payment.isSuccess()).toBe(true);
      expect(payment.gatewayPaymentRef).toBeNull();
    });
  });

  describe('markAsFailed', () => {
    it('should transition to FAILED with error details', () => {
      const payment = createPayment();

      payment.markAsFailed('CARD_DECLINED', 'Insufficient funds', { raw: 'error' });

      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.errorCode).toBe('CARD_DECLINED');
      expect(payment.errorMessage).toBe('Insufficient funds');
      expect(payment.gatewayResponse).toEqual({ raw: 'error' });
    });

    it('should work without gateway response', () => {
      const payment = createPayment();

      payment.markAsFailed('TIMEOUT', 'Gateway timeout');

      expect(payment.isFailed()).toBe(true);
      expect(payment.errorCode).toBe('TIMEOUT');
      expect(payment.gatewayResponse).toBeNull();
    });
  });

  describe('incrementAttempt', () => {
    it('should increment attempt number', () => {
      const payment = createPayment();
      expect(payment.attemptNumber).toBe(1);

      payment.incrementAttempt();
      expect(payment.attemptNumber).toBe(2);

      payment.incrementAttempt();
      expect(payment.attemptNumber).toBe(3);
    });

    it('should throw when max attempts exceeded', () => {
      const payment = createPayment();
      payment.incrementAttempt(); // 2
      payment.incrementAttempt(); // 3

      expect(() => payment.incrementAttempt()).toThrow('Maximum payment attempts');
    });
  });

  describe('query methods', () => {
    it('isPending returns true for new payment', () => {
      const payment = createPayment();
      expect(payment.isPending()).toBe(true);
    });

    it('canRetry returns true when attempts < 3', () => {
      const payment = createPayment();
      expect(payment.canRetry()).toBe(true);

      payment.incrementAttempt();
      expect(payment.canRetry()).toBe(true);

      payment.incrementAttempt();
      expect(payment.canRetry()).toBe(false); // at max
    });
  });

  describe('reconstitute', () => {
    it('should restore payment from persistence', () => {
      const payment = PaymentEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        orderId: validOrderId,
        amountValue: 200,
        amountCurrency: 'USD',
        provider: PaymentMethod.STRIPE,
        status: PaymentStatus.SUCCESS,
        gatewayResponse: { pi: 'pi_abc' },
        gatewayPaymentRef: 'pi_abc',
        errorCode: null,
        errorMessage: null,
        attemptNumber: 1,
        createdAt: new Date('2026-01-01'),
      });

      expect(payment.id).toBe('550e8400-e29b-41d4-a716-446655440099');
      expect(payment.provider).toBe(PaymentMethod.STRIPE);
      expect(payment.isSuccess()).toBe(true);
      expect(payment.amount.amount).toBe(200);
      expect(payment.amount.currency).toBe('USD');
    });
  });
});
