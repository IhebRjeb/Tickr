import * as crypto from 'crypto';

import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymeeAdapter } from '@modules/payments/infrastructure/adapters/paymee.adapter';
import { ConfigService } from '@nestjs/config';
import { Money } from '@shared/domain/value-objects/money.vo';


// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('PaymeeAdapter', () => {
  let adapter: PaymeeAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          PAYMEE_API_URL: 'https://sandbox.paymee.tn/api/v2',
          PAYMEE_API_KEY: 'test_api_key',
          PAYMEE_WEBHOOK_SECRET: 'paymee_secret',
          PAYMENT_SUCCESS_URL: 'https://tickr.tn/payment/success',
          PAYMENT_FAIL_URL: 'https://tickr.tn/payment/fail',
          PAYMEE_WEBHOOK_URL: 'https://api.tickr.tn/webhooks/paymee',
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    adapter = new PaymeeAdapter(mockConfigService);
    mockFetch.mockReset();
  });

  function createMockOrder(): OrderEntity {
    return OrderEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status: OrderStatus.PENDING,
      subtotalAmount: 50,
      platformFeeAmount: 2,
      paymentFeesAmount: 0,
      totalAmount: 52,
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
      metadata: { holderFirstName: 'Ahmed', holderLastName: 'Ben Ali', holderEmail: 'ahmed@example.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  describe('createPaymentIntent', () => {
    it('should create payment and return redirect URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            token: 'pm_token_123',
            payment_url: 'https://sandbox.paymee.tn/gateway/pm_token_123',
          },
        }),
      });

      const order = createMockOrder();
      const result = await adapter.createPaymentIntent(order);

      expect(result.id).toBe('pm_token_123');
      expect(result.paymentUrl).toBe('https://sandbox.paymee.tn/gateway/pm_token_123');
      expect(result.status).toBe('pending');

      // Verify amount is in TND decimal (52)
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.amount).toBe(52);
      expect(callBody.first_name).toBe('Ahmed');
      expect(callBody.last_name).toBe('Ben Ali');
      expect(callBody.email).toBe('ahmed@example.com');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const order = createMockOrder();
      await expect(adapter.createPaymentIntent(order)).rejects.toThrow(
        'Paymee payment creation failed: 401',
      );
    });
  });

  describe('confirmPayment', () => {
    it('should return success for completed payment', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            payment_status: true,
            amount: 52,
            transaction_id: 'txn_paymee_456',
          },
        }),
      });

      const result = await adapter.confirmPayment('pm_token_123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn_paymee_456');
      expect(result.amount).toBe(52);
      expect(result.currency).toBe('TND');
    });

    it('should return failure for unpaid', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            payment_status: false,
            amount: 52,
            transaction_id: '',
          },
        }),
      });

      const result = await adapter.confirmPayment('pm_token_123');

      expect(result.success).toBe(false);
    });
  });

  describe('refund', () => {
    it('should process refund successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { refund_id: 'ref_paymee_789' },
        }),
      });

      const amount = Money.create(50, 'TND');

      const result = await adapter.refund('pm_token_123', amount);

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('ref_paymee_789');
      expect(result.amount).toBe(50);
    });

    it('should handle refund failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      });

      const amount = Money.create(50, 'TND');

      const result = await adapter.refund('pm_token_123', amount);

      expect(result.success).toBe(false);
      expect(result.amount).toBe(50);
    });
  });

  describe('verifyWebhook', () => {
    it('should verify valid check_sum (md5)', () => {
      const token = 'dfe54df34b54df3a854f3a53fc85a';
      const paymentStatus = true;
      const statusBit = '1';
      const apiKey = 'test_api_key';

      const checkSum = crypto
        .createHash('md5')
        .update(token + statusBit + apiKey)
        .digest('hex');

      const body = { token, check_sum: checkSum, payment_status: paymentStatus };

      const result = adapter.verifyWebhook('', body);
      expect(result).toBe(true);
    });

    it('should reject invalid check_sum', () => {
      const body = {
        token: 'some_token',
        check_sum: 'invalid_checksum_value_here_abc',
        payment_status: true,
      };

      const result = adapter.verifyWebhook('', body);
      expect(result).toBe(false);
    });

    it('should return false for missing token or check_sum', () => {
      const result = adapter.verifyWebhook('', {});
      expect(result).toBe(false);
    });
  });
});
