import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrencyVO, Currency } from '@shared/domain/value-objects/currency.vo';
import { Money } from '@shared/domain/value-objects/money.vo';
import Stripe from 'stripe';


import type {
  PaymentProviderPort,
  PaymentIntent,
  PaymentResult,
  RefundResult,
} from '../../application/ports/payment-provider.port';
import { OrderEntity } from '../../domain/entities/order.entity';

/**
 * Stripe Payment Gateway Adapter
 *
 * Handles international payments (EUR, USD).
 * Uses Stripe PaymentIntents API.
 *
 * Amount conversion: Stripe expects amounts in smallest currency unit (cents).
 */
@Injectable()
export class StripeAdapter implements PaymentProviderPort {
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async createPaymentIntent(order: OrderEntity): Promise<PaymentIntent> {
    this.logger.debug(`Creating Stripe PaymentIntent for order ${order.id}`);

    const amountInSmallestUnit = CurrencyVO.toSmallestUnit(
      order.totalAmount,
      order.currency as Currency,
    );

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        eventId: order.eventId,
        userId: order.userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
      status: paymentIntent.status,
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    this.logger.debug(`Confirming Stripe payment: ${paymentIntentId}`);

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: paymentIntent.status === 'succeeded',
      transactionId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  async refund(paymentIntentId: string, amount: Money): Promise<RefundResult> {
    this.logger.debug(`Refunding Stripe payment: ${paymentIntentId}`);

    const amountInSmallestUnit = CurrencyVO.toSmallestUnit(
      amount.amount,
      amount.currency as Currency,
    );

    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountInSmallestUnit,
    });

    return {
      success: refund.status === 'succeeded',
      refundId: refund.id,
      amount: refund.amount ?? amountInSmallestUnit,
    };
  }

  verifyWebhook(signature: string, body: unknown): boolean {
    try {
      this.stripe.webhooks.constructEvent(
        body as string | Buffer,
        signature,
        this.webhookSecret,
      );
      return true;
    } catch {
      this.logger.warn('Invalid Stripe webhook signature');
      return false;
    }
  }
}
