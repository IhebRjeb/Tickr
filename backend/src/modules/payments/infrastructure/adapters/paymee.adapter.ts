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
 * Paymee Payment Gateway Adapter (TN Fallback)
 *
 * Handles Tunisian payments in TND as a fallback to Konnect.
 * Uses Paymee REST API (redirect-based flow).
 *
 * Amount: Paymee expects amounts in TND (decimal format, e.g. 10.500).
 *
 * Flow:
 * 1. Create payment → get redirect URL + token
 * 2. User pays on Paymee hosted page
 * 3. Webhook notifies payment status
 */
@Injectable()
export class PaymeeAdapter implements PaymentProviderPort {
  private readonly logger = new Logger(PaymeeAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'PAYMEE_API_URL',
      'https://sandbox.paymee.tn/api/v2',
    );
    this.apiKey = this.configService.get<string>('PAYMEE_API_KEY', '');
  }

  async createPaymentIntent(order: OrderEntity): Promise<PaymentIntent> {
    this.logger.debug(`Creating Paymee payment for order ${order.id}`);

    // Paymee expects TND in decimal format
    const amount = order.totalAmount;

    const response = await fetch(`${this.apiUrl}/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.apiKey}`,
      },
      body: JSON.stringify({
        amount,
        note: `Tickr - Order ${order.id}`,
        first_name: (order.metadata as OrderHolderMetadata | null)?.holderFirstName || 'Customer',
        last_name: (order.metadata as OrderHolderMetadata | null)?.holderLastName || 'Customer',
        email: (order.metadata as OrderHolderMetadata | null)?.holderEmail || '',
        phone: (order.metadata as OrderHolderMetadata | null)?.holderPhone || '',
        return_url: this.configService.get<string>(
          'PAYMENT_SUCCESS_URL',
          'https://tick-r.tn/payments/success',
        ),
        cancel_url: this.configService.get<string>(
          'PAYMENT_FAIL_URL',
          'https://tick-r.tn/payments/failure',
        ),
        webhook_url: this.configService.get<string>(
          'PAYMEE_WEBHOOK_URL',
          'https://api.tick-r.tn/api/payments/webhooks/paymee',
        ),
        order_id: order.id,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Paymee payment creation failed: ${response.status} ${errorBody}`);
      throw new Error(`Paymee payment creation failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      data: { token: string; payment_url: string };
    };

    return {
      id: data.data.token,
      paymentUrl: data.data.payment_url,
      status: 'pending',
    };
  }

  async confirmPayment(token: string): Promise<PaymentResult> {
    this.logger.debug(`Checking Paymee payment status: ${token}`);

    const response = await fetch(`${this.apiUrl}/payments/${token}/check`, {
      method: 'GET',
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Paymee payment check failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      data: { payment_status: boolean; amount: number; transaction_id: string };
    };

    return {
      success: data.data.payment_status,
      transactionId: data.data.transaction_id || token,
      amount: data.data.amount,
      currency: 'TND',
    };
  }

  async refund(token: string, amount: Money): Promise<RefundResult> {
    this.logger.debug(`Refunding Paymee payment: ${token}`);

    const response = await fetch(`${this.apiUrl}/payments/${token}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.apiKey}`,
      },
      body: JSON.stringify({
        amount: amount.amount,
      }),
    });

    if (!response.ok) {
      this.logger.error(`Paymee refund failed: ${response.status}`);
      return {
        success: false,
        amount: amount.amount,
      };
    }

    const data = (await response.json()) as {
      data: { refund_id: string };
    };

    return {
      success: true,
      refundId: data.data.refund_id,
      amount: amount.amount,
    };
  }

  verifyWebhook(_signature: string, body: unknown): boolean {
    // Paymee uses check_sum = md5(token + payment_status(1|0) + API_TOKEN)
    try {
      const payload = body as {
        token: string;
        check_sum: string;
        payment_status: boolean;
      };

      if (!payload.token || !payload.check_sum) {
        return false;
      }

      const statusBit = payload.payment_status ? '1' : '0';
      const expectedCheckSum = crypto
        .createHash('md5')
        .update(payload.token + statusBit + this.apiKey)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(payload.check_sum),
        Buffer.from(expectedCheckSum),
      );
    } catch {
      this.logger.warn('Invalid Paymee webhook checksum');
      return false;
    }
  }
}
