import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { KonnectAdapter } from '@modules/payments/infrastructure/adapters/konnect.adapter';
import { ConfigService } from '@nestjs/config';
import { Money } from '@shared/domain/value-objects/money.vo';


// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('KonnectAdapter', () => {
  let adapter: KonnectAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          KONNECT_API_URL: 'https://api.preprod.konnect.network/api/v2',
          KONNECT_API_KEY: 'test_key',
          KONNECT_WALLET_ID: 'wallet_123',
          KONNECT_WEBHOOK_SECRET: 'secret_123',
          KONNECT_WEBHOOK_URL: 'https://api.tickr.tn/webhooks/konnect',
          PAYMENT_SUCCESS_URL: 'https://tickr.tn/payment/success',
          PAYMENT_FAIL_URL: 'https://tickr.tn/payment/fail',
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    adapter = new KonnectAdapter(mockConfigService);
    mockFetch.mockReset();
  });

  function createMockOrder(): OrderEntity {
    return OrderEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status: OrderStatus.PENDING,
      subtotalAmount: 100,
      platformFeeAmount: 4,
      paymentFeesAmount: 0,
      totalAmount: 104,
      currency: 'TND',
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
    it('should create payment and return redirect URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          payUrl: 'https://konnect.network/pay/abc123',
          paymentRef: 'kn_ref_123',
        }),
      });

      const order = createMockOrder();
      const result = await adapter.createPaymentIntent(order);

      expect(result.id).toBe('kn_ref_123');
      expect(result.paymentUrl).toBe('https://konnect.network/pay/abc123');
      expect(result.status).toBe('pending');

      // Verify amount is in millimes (104 TND × 1000 = 104000)
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.amount).toBe(104000);
      expect(callBody.receiverWalletId).toBe('wallet_123');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      const order = createMockOrder();
      await expect(adapter.createPaymentIntent(order)).rejects.toThrow(
        'Konnect payment initialization failed: 400',
      );
    });
  });

  describe('confirmPayment', () => {
    it('should return success for completed payment', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          payment: { status: 'completed', amount: 104000, transactionId: 'txn_123' },
        }),
      });

      const result = await adapter.confirmPayment('kn_ref_123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn_123');
      expect(result.currency).toBe('TND');
    });

    it('should return failure for pending payment', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          payment: { status: 'pending', amount: 104000 },
        }),
      });

      const result = await adapter.confirmPayment('kn_ref_123');

      expect(result.success).toBe(false);
    });
  });

  describe('refund', () => {
    it('should return failure (manual processing required)', async () => {
      const amount = Money.create(100, 'TND');

      const result = await adapter.refund('kn_ref_123', amount);

      expect(result.success).toBe(false);
      expect(result.amount).toBe(100);
    });
  });

  describe('verifyWebhook', () => {
    it('should return true for valid signature', () => {
      expect(adapter.verifyWebhook('secret_123', {})).toBe(true);
    });

    it('should return false for invalid signature', () => {
      expect(adapter.verifyWebhook('wrong_secret', {})).toBe(false);
    });
  });
});
