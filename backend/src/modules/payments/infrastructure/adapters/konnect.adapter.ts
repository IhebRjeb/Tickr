import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Money } from '@shared/domain/value-objects/money.vo';

import type {
  PaymentProviderPort,
  PaymentIntent,
  PaymentResult,
  RefundResult,
} from '../../application/ports/payment-provider.port';
import { OrderEntity } from '../../domain/entities/order.entity';

interface OrderHolderMetadata {
  holderFirstName?: string;
  holderLastName?: string;
  holderPhone?: string;
  holderEmail?: string;
}

/**
 * Konnect Payment Gateway Adapter (Primary TN Gateway)
 *
 * Handles Tunisian payments in TND.
 * Uses Konnect REST API (redirect-based flow).
 *
 * Amount conversion: Konnect expects amounts in millimes (TND × 1000).
 *
 * Flow:
 * 1. Create payment → get redirect URL
 * 2. User pays on Konnect hosted page
 * 3. Webhook notifies payment status
 *
 * Refund: Manual via Konnect dashboard (no API support)
 */
@Injectable()
export class KonnectAdapter implements PaymentProviderPort {
  private readonly logger = new Logger(KonnectAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly receiverWalletId: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'KONNECT_API_URL',
      'https://api.preprod.konnect.network/api/v2',
    );
    this.apiKey = this.configService.get<string>('KONNECT_API_KEY', '');
    this.receiverWalletId = this.configService.get<string>('KONNECT_WALLET_ID', '');
    this.webhookSecret = this.configService.get<string>('KONNECT_WEBHOOK_SECRET', '');
  }

  async createPaymentIntent(order: OrderEntity): Promise<PaymentIntent> {
    this.logger.debug(`Creating Konnect payment for order ${order.id}`);

    // Konnect expects millimes (TND × 1000)
    const amountInMillimes = Math.round(order.totalAmount * 1000);

    const response = await fetch(`${this.apiUrl}/payments/init-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        receiverWalletId: this.receiverWalletId,
        amount: amountInMillimes,
        token: 'TND',
        type: 'immediate',
        description: `Tickr - Order ${order.id}`,
        acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
        lifespan: 15, // minutes
        checkoutForm: true,
        addPaymentFeesToAmount: false,
        firstName: (order.metadata as OrderHolderMetadata | null)?.holderFirstName || '',
        lastName: (order.metadata as OrderHolderMetadata | null)?.holderLastName || '',
        phoneNumber: (order.metadata as OrderHolderMetadata | null)?.holderPhone || '',
        email: (order.metadata as OrderHolderMetadata | null)?.holderEmail || '',
        orderId: order.id,
        webhook: this.configService.get<string>(
          'KONNECT_WEBHOOK_URL',
          'https://api.tick-r.tn/api/payments/webhooks/konnect',
        ),
        silentWebhook: true,
        successUrl: this.configService.get<string>(
          'PAYMENT_SUCCESS_URL',
          'https://tick-r.tn/payments/success',
        ),
        failUrl: this.configService.get<string>(
          'PAYMENT_FAIL_URL',
          'https://tick-r.tn/payments/failure',
        ),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Konnect payment init failed: ${response.status} ${errorBody}`);
      throw new Error(`Konnect payment initialization failed: ${response.status}`);
    }

    const data = (await response.json()) as { payUrl: string; paymentRef: string };

    return {
      id: data.paymentRef,
      paymentUrl: data.payUrl,
      status: 'pending',
    };
  }

  async confirmPayment(paymentRef: string): Promise<PaymentResult> {
    this.logger.debug(`Checking Konnect payment status: ${paymentRef}`);

    const response = await fetch(`${this.apiUrl}/payments/${paymentRef}`, {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Konnect payment check failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      payment: { status: string; amount: number; transactionId?: string };
    };

    const isCompleted = data.payment.status === 'completed';

    return {
      success: isCompleted,
      transactionId: data.payment.transactionId || paymentRef,
      amount: data.payment.amount,
      currency: 'TND',
    };
  }

  async refund(_paymentRef: string, amount: Money): Promise<RefundResult> {
    // Konnect does not support automated refunds via API
    // Refunds must be processed manually through the Konnect dashboard
    this.logger.warn('Konnect refund requires manual processing via dashboard');

    return {
      success: false,
      amount: amount.amount,
    };
  }

  verifyWebhook(signature: string, _body: unknown): boolean {
    // Konnect uses a simple token-based verification
    // Use timing-safe comparison to prevent timing attacks
    if (!signature || !this.webhookSecret) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(this.webhookSecret),
      );
    } catch {
      return false;
    }
  }
}
