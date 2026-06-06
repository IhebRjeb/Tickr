import { ConfigService } from '@nestjs/config';

import { Money } from '@shared/domain/value-objects/money.vo';

import { StripeAdapter } from '@modules/payments/infrastructure/adapters/stripe.adapter';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';

// Mock Stripe SDK
const mockPaymentIntentsCreate = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn();
const mockRefundsCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      retrieve: mockPaymentIntentsRetrieve,
    },
    refunds: {
      create: mockRefundsCreate,
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  }));
});

describe('StripeAdapter', () => {
  let adapter: StripeAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          STRIPE_SECRET_KEY: 'sk_test_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_456',
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    adapter = new StripeAdapter(mockConfigService);
    jest.clearAllMocks();
  });

  function createMockOrder(currency = 'EUR', totalAmount = 50): OrderEntity {
    return OrderEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status: OrderStatus.PENDING,
      subtotalAmount: totalAmount - 2,
      platformFeeAmount: 2,
      paymentFeesAmount: 0,
      totalAmount,
      currency,
      paymentMethod: null,
      paymentGatewayOrderId: null,
      paymentIntentId: null,
      gatewayPaymentRef: null,
      transactionId: null,
      paidAt: null,
      refundedAt: null,
      refundReason: null,
      expiresAt: new Date(),
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  describe('createPaymentIntent', () => {
    it('should create PaymentIntent with correct amount in cents for EUR', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        status: 'requires_payment_method',
      });

      const order = createMockOrder('EUR', 50);
      const result = await adapter.createPaymentIntent(order);

      expect(result.id).toBe('pi_test_123');
      expect(result.clientSecret).toBe('pi_test_123_secret_abc');
      expect(result.status).toBe('requires_payment_method');

      // EUR: 50 × 100 = 5000 cents
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'eur',
        metadata: {
          orderId: order.id,
          eventId: order.eventId,
          userId: order.userId,
        },
        automatic_payment_methods: { enabled: true },
      });
    });

    it('should create PaymentIntent with correct amount in cents for USD', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_usd_456',
        client_secret: 'pi_usd_456_secret',
        status: 'requires_payment_method',
      });

      const order = createMockOrder('USD', 25);
      const result = await adapter.createPaymentIntent(order);

      expect(result.id).toBe('pi_usd_456');
      // USD: 25 × 100 = 2500 cents
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2500, currency: 'usd' }),
      );
    });

    it('should handle null client_secret', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_no_secret',
        client_secret: null,
        status: 'requires_confirmation',
      });

      const order = createMockOrder();
      const result = await adapter.createPaymentIntent(order);

      expect(result.clientSecret).toBeUndefined();
    });

    it('should propagate Stripe API errors', async () => {
      mockPaymentIntentsCreate.mockRejectedValue(
        new Error('Your card was declined'),
      );

      const order = createMockOrder();
      await expect(adapter.createPaymentIntent(order)).rejects.toThrow(
        'Your card was declined',
      );
    });
  });

  describe('confirmPayment', () => {
    it('should return success for succeeded payment', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 5000,
        currency: 'eur',
      });

      const result = await adapter.confirmPayment('pi_test_123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('pi_test_123');
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('eur');
    });

    it('should return failure for non-succeeded payment', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_test_456',
        status: 'requires_payment_method',
        amount: 2500,
        currency: 'usd',
      });

      const result = await adapter.confirmPayment('pi_test_456');

      expect(result.success).toBe(false);
      expect(result.transactionId).toBe('pi_test_456');
    });
  });

  describe('refund', () => {
    it('should create refund with correct amount', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_test_789',
        status: 'succeeded',
        amount: 3000,
      });

      const amount = Money.create(30, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('re_test_789');
      expect(result.amount).toBe(3000);

      // EUR: 30 × 100 = 3000 cents
      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 3000,
      });
    });

    it('should handle partial refund', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_partial_123',
        status: 'succeeded',
        amount: 1000,
      });

      const amount = Money.create(10, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(1000);
    });

    it('should handle refund with null amount in response', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_null_amt',
        status: 'succeeded',
        amount: null,
      });

      const amount = Money.create(20, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(true);
      // Falls back to calculated amount (20 × 100 = 2000)
      expect(result.amount).toBe(2000);
    });

    it('should return failure for failed refund', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_fail_123',
        status: 'failed',
        amount: 5000,
      });

      const amount = Money.create(50, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(false);
    });
  });

  describe('verifyWebhook', () => {
    it('should return true for valid signature', () => {
      mockWebhooksConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded' });

      const result = adapter.verifyWebhook('valid_sig', 'body');
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = adapter.verifyWebhook('invalid_sig', 'body');
      expect(result).toBe(false);
    });
  });
});
