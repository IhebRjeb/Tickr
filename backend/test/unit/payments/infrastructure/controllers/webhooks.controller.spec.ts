

import { ConfirmPaymentHandler } from '@modules/payments/application/commands/confirm-payment/confirm-payment.handler';
import { FailPaymentHandler } from '@modules/payments/application/commands/fail-payment/fail-payment.handler';
import { PAYMENT_PROVIDER_FACTORY } from '@modules/payments/application/ports/payment-provider.port';
import type { PaymentProviderFactoryPort, PaymentProviderPort } from '@modules/payments/application/ports/payment-provider.port';
import { WEBHOOK_EVENT_STORE } from '@modules/payments/application/ports/webhook-event-store.port';
import type { WebhookEventStorePort } from '@modules/payments/application/ports/webhook-event-store.port';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { WebhooksController } from '@modules/payments/infrastructure/controllers/webhooks.controller';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '@shared/domain/result';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let mockConfirmPaymentHandler: jest.Mocked<ConfirmPaymentHandler>;
  let mockFailPaymentHandler: jest.Mocked<FailPaymentHandler>;
  let mockProviderFactory: jest.Mocked<PaymentProviderFactoryPort>;
  let mockWebhookEventStore: jest.Mocked<WebhookEventStorePort>;
  let mockStripeProvider: jest.Mocked<PaymentProviderPort>;
  let mockKonnectProvider: jest.Mocked<PaymentProviderPort>;
  let mockPaymeeProvider: jest.Mocked<PaymentProviderPort>;

  beforeEach(async () => {
    mockConfirmPaymentHandler = { execute: jest.fn() } as any;
    mockFailPaymentHandler = { execute: jest.fn() } as any;

    mockWebhookEventStore = {
      tryMarkAsProcessed: jest.fn().mockResolvedValue(true),
      isProcessed: jest.fn().mockResolvedValue(false),
    };

    mockStripeProvider = {
      verifyWebhook: jest.fn(),
      confirmPayment: jest.fn(),
      createPaymentIntent: jest.fn(),
      refund: jest.fn(),
    };

    mockKonnectProvider = {
      verifyWebhook: jest.fn(),
      confirmPayment: jest.fn(),
      createPaymentIntent: jest.fn(),
      refund: jest.fn(),
    };

    mockPaymeeProvider = {
      verifyWebhook: jest.fn(),
      confirmPayment: jest.fn(),
      createPaymentIntent: jest.fn(),
      refund: jest.fn(),
    };

    mockProviderFactory = {
      getProvider: jest.fn().mockImplementation((method: PaymentMethod) => {
        switch (method) {
          case PaymentMethod.STRIPE:
            return mockStripeProvider;
          case PaymentMethod.KONNECT:
            return mockKonnectProvider;
          case PaymentMethod.PAYMEE:
            return mockPaymeeProvider;
        }
      }),
      getSupportedMethods: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: ConfirmPaymentHandler, useValue: mockConfirmPaymentHandler },
        { provide: FailPaymentHandler, useValue: mockFailPaymentHandler },
        { provide: PAYMENT_PROVIDER_FACTORY, useValue: mockProviderFactory },
        { provide: WEBHOOK_EVENT_STORE, useValue: mockWebhookEventStore },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  describe('handleStripeWebhook', () => {
    const createReq = (body: object) => ({
      rawBody: Buffer.from(JSON.stringify(body)),
    });

    it('should confirm payment on payment_intent.succeeded', async () => {
      const event = {
        id: 'evt_stripe_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', metadata: { orderId: 'order-123' }, status: 'succeeded' } },
      };
      const req = createReq(event) as any;
      mockStripeProvider.verifyWebhook.mockReturnValue(true);
      mockConfirmPaymentHandler.execute.mockResolvedValue(Result.ok(undefined as any));

      const result = await controller.handleStripeWebhook('sig_123', req);

      expect(result).toEqual({ received: true });
      expect(mockConfirmPaymentHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should fail payment on payment_intent.payment_failed', async () => {
      const event = {
        id: 'evt_stripe_456',
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_123', metadata: { orderId: 'order-123' }, status: 'failed' } },
      };
      const req = createReq(event) as any;
      mockStripeProvider.verifyWebhook.mockReturnValue(true);
      mockFailPaymentHandler.execute.mockResolvedValue(Result.ok({ canRetry: true, attemptNumber: 1 }));

      const result = await controller.handleStripeWebhook('sig_123', req);

      expect(result).toEqual({ received: true });
      expect(mockFailPaymentHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid signature', async () => {
      const req = createReq({ type: 'test' }) as any;
      mockStripeProvider.verifyWebhook.mockReturnValue(false);

      await expect(
        controller.handleStripeWebhook('bad_sig', req),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing signature', async () => {
      const req = { rawBody: Buffer.from('{}') } as any;

      await expect(
        controller.handleStripeWebhook('', req),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return received:true when orderId missing in metadata', async () => {
      const event = {
        id: 'evt_stripe_789',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', metadata: {}, status: 'succeeded' } },
      };
      const req = createReq(event) as any;
      mockStripeProvider.verifyWebhook.mockReturnValue(true);

      const result = await controller.handleStripeWebhook('sig_123', req);

      expect(result).toEqual({ received: true });
      expect(mockConfirmPaymentHandler.execute).not.toHaveBeenCalled();
    });
  });

  describe('handleKonnectWebhook', () => {
    it('should confirm payment when konnect reports success', async () => {
      mockKonnectProvider.confirmPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn_kn_123',
        amount: 104000,
        currency: 'TND',
      });
      mockConfirmPaymentHandler.execute.mockResolvedValue(Result.ok(undefined as any));

      const result = await controller.handleKonnectWebhook('kn_ref_123');

      expect(result).toEqual({ received: true });
      expect(mockConfirmPaymentHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should fail payment when konnect reports failure', async () => {
      mockKonnectProvider.confirmPayment.mockResolvedValue({
        success: false,
        transactionId: 'kn_ref_123',
        amount: 104000,
        currency: 'TND',
      });
      mockFailPaymentHandler.execute.mockResolvedValue(Result.ok({ canRetry: true, attemptNumber: 1 }));

      const result = await controller.handleKonnectWebhook('kn_ref_123');

      expect(result).toEqual({ received: true });
      expect(mockFailPaymentHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for missing payment_ref', async () => {
      await expect(controller.handleKonnectWebhook('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handlePaymeeWebhook', () => {
    it('should confirm payment on valid successful webhook', async () => {
      const body = {
        token: 'pm_token_123',
        check_sum: 'valid_checksum',
        payment_status: true,
        order_id: 'order-123',
        transaction_id: 5578,
        amount: 52,
      };
      mockPaymeeProvider.verifyWebhook.mockReturnValue(true);
      mockConfirmPaymentHandler.execute.mockResolvedValue(Result.ok(undefined as any));

      const result = await controller.handlePaymeeWebhook(body);

      expect(result).toEqual({ received: true });
      expect(mockConfirmPaymentHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should fail payment on valid failed webhook', async () => {
      const body = {
        token: 'pm_token_123',
        check_sum: 'valid_checksum',
        payment_status: false,
      };
      mockPaymeeProvider.verifyWebhook.mockReturnValue(true);
      mockFailPaymentHandler.execute.mockResolvedValue(Result.ok({ canRetry: false, attemptNumber: 3 }));

      const result = await controller.handlePaymeeWebhook(body);

      expect(result).toEqual({ received: true });
      expect(mockFailPaymentHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid checksum', async () => {
      const body = {
        token: 'pm_token_123',
        check_sum: 'bad_checksum',
        payment_status: true,
      };
      mockPaymeeProvider.verifyWebhook.mockReturnValue(false);

      await expect(controller.handlePaymeeWebhook(body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing token', async () => {
      const body = { token: '', check_sum: '', payment_status: true };

      await expect(controller.handlePaymeeWebhook(body)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
