import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';

import { ConfirmPaymentCommand } from '../../application/commands/confirm-payment/confirm-payment.command';
import { ConfirmPaymentHandler } from '../../application/commands/confirm-payment/confirm-payment.handler';
import { FailPaymentCommand } from '../../application/commands/fail-payment/fail-payment.command';
import { FailPaymentHandler } from '../../application/commands/fail-payment/fail-payment.handler';
import { PAYMENT_PROVIDER_FACTORY } from '../../application/ports/payment-provider.port';
import type { PaymentProviderFactoryPort } from '../../application/ports/payment-provider.port';
import { PaymentMethod } from '../../domain/value-objects/payment-method.vo';

@ApiTags('Payment Webhooks')
@Controller('payments/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly confirmPaymentHandler: ConfirmPaymentHandler,
    private readonly failPaymentHandler: FailPaymentHandler,
    @Inject(PAYMENT_PROVIDER_FACTORY)
    private readonly providerFactory: PaymentProviderFactoryPort,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const provider = this.providerFactory.getProvider(PaymentMethod.STRIPE);
    const rawBody = req.rawBody;

    if (!signature || !rawBody) {
      throw new BadRequestException('Missing signature or body');
    }

    const isValid = provider.verifyWebhook(signature, rawBody);
    if (!isValid) {
      this.logger.warn('Invalid Stripe webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString()) as {
      type: string;
      data: { object: { id: string; metadata?: { orderId?: string }; status: string } };
    };

    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      this.logger.warn('Stripe webhook missing orderId in metadata');
      return { received: true };
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.handlePaymentSuccess(
        orderId,
        paymentIntent.id,
        paymentIntent.id,
        { gateway: 'stripe', event: event.type },
      );
    } else if (
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      await this.handlePaymentFailure(orderId, 'STRIPE_FAILED', event.type);
    }

    return { received: true };
  }

  @Get('konnect')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleKonnectWebhook(
    @Query('payment_ref') paymentRef: string,
  ) {
    if (!paymentRef) {
      throw new BadRequestException('Missing payment_ref');
    }

    this.logger.debug(`Konnect webhook received: ${paymentRef}`);

    const provider = this.providerFactory.getProvider(PaymentMethod.KONNECT);
    const paymentResult = await provider.confirmPayment(paymentRef);

    // Find the order associated with this payment ref
    // Konnect webhook sends payment_ref which we stored as gatewayPaymentRef
    if (paymentResult.success) {
      await this.handlePaymentSuccess(
        paymentRef, // orderId lookup happens in handler via gatewayRef
        paymentRef,
        paymentResult.transactionId,
        { gateway: 'konnect', amount: paymentResult.amount },
      );
    } else {
      await this.handlePaymentFailure(paymentRef, 'KONNECT_FAILED', 'Payment not completed');
    }

    return { received: true };
  }

  @Post('paymee')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handlePaymeeWebhook(
    @Body()
    body: {
      token: string;
      check_sum: string;
      payment_status: boolean;
      order_id?: string;
      transaction_id?: number;
      amount?: number;
    },
  ) {
    if (!body.token || !body.check_sum) {
      throw new BadRequestException('Missing token or check_sum');
    }

    const provider = this.providerFactory.getProvider(PaymentMethod.PAYMEE);
    const isValid = provider.verifyWebhook('', body);

    if (!isValid) {
      this.logger.warn('Invalid Paymee webhook checksum');
      throw new BadRequestException('Invalid webhook checksum');
    }

    this.logger.debug(`Paymee webhook: token=${body.token}, status=${body.payment_status}`);

    if (body.payment_status) {
      await this.handlePaymentSuccess(
        body.token, // gatewayRef — handler resolves order from this
        body.token,
        body.transaction_id?.toString() || body.token,
        { gateway: 'paymee', amount: body.amount },
      );
    } else {
      await this.handlePaymentFailure(body.token, 'PAYMEE_FAILED', 'Payment failed');
    }

    return { received: true };
  }

  // ============================================
  // Private helpers
  // ============================================

  private async handlePaymentSuccess(
    gatewayRef: string,
    orderId: string,
    transactionId: string,
    gatewayResponse: Record<string, unknown>,
  ): Promise<void> {
    const command = new ConfirmPaymentCommand(
      orderId,
      gatewayRef,
      transactionId,
      gatewayResponse,
    );

    const result = await this.confirmPaymentHandler.execute(command);

    if (result.isFailure) {
      this.logger.error(
        `Failed to confirm payment: ${result.error.type} - ${result.error.message}`,
      );
    }
  }

  private async handlePaymentFailure(
    orderId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    const command = new FailPaymentCommand(orderId, errorCode, errorMessage);

    const result = await this.failPaymentHandler.execute(command);

    if (result.isFailure) {
      this.logger.error(
        `Failed to mark payment as failed: ${result.error.type} - ${result.error.message}`,
      );
    }
  }
}
