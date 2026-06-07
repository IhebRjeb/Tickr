import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { PaymentEntity } from '../../../domain/entities/payment.entity';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import { PAYMENT_REPOSITORY } from '../../ports/payment.repository.port';
import { PAYMENT_PROVIDER_FACTORY } from '../../ports/payment-provider.port';

import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import type { PaymentRepositoryPort } from '../../ports/payment.repository.port';
import type { PaymentProviderFactoryPort } from '../../ports/payment-provider.port';

import {
  ProcessPaymentCommand,
  ProcessPaymentError,
  ProcessPaymentResult,
} from './process-payment.command';

@Injectable()
export class ProcessPaymentHandler {
  private readonly logger = new Logger(ProcessPaymentHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryPort,
    @Inject(PAYMENT_PROVIDER_FACTORY)
    private readonly providerFactory: PaymentProviderFactoryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: ProcessPaymentCommand,
  ): Promise<Result<ProcessPaymentResult, ProcessPaymentError>> {
    this.logger.debug(`Processing payment for order ${command.orderId}`);

    // 1. Find order
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order ${command.orderId} not found`,
      });
    }

    // 2. Verify ownership
    if (order.userId !== command.userId) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order ${command.orderId} not found`,
      });
    }

    // 3. Check expiration
    if (order.isExpired()) {
      return Result.fail({
        type: 'ORDER_EXPIRED',
        message: 'Order has expired. Please create a new order.',
      });
    }

    // 4. Validate status (must be PENDING or PROCESSING for retry)
    if (!order.isPending() && !order.isProcessing()) {
      return Result.fail({
        type: 'INVALID_STATUS',
        message: `Order is in ${order.status} status and cannot be processed`,
      });
    }

    // 5. Check max attempts
    const attemptCount = await this.paymentRepository.countByOrderId(command.orderId);
    if (attemptCount >= PaymentEntity.MAX_ATTEMPTS) {
      return Result.fail({
        type: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum payment attempts reached. Please create a new order.',
      });
    }

    // 6. Check for existing pending payment (idempotent retry)
    const existingPayments = await this.paymentRepository.findByOrderId(command.orderId);
    const pendingPayment = existingPayments.find(
      (p) => p.isPending() && p.gatewayPaymentRef,
    );
    if (pendingPayment) {
      // Return existing payment intent — idempotent retry
      this.logger.debug(
        `Returning existing pending payment for order ${command.orderId}` +
        (command.idempotencyKey ? ` (idempotencyKey: ${command.idempotencyKey})` : ''),
      );
      return Result.ok({
        paymentUrl: pendingPayment.paymentUrl || undefined,
        clientSecret: pendingPayment.clientSecret || undefined,
        orderId: order.id,
        gatewayRef: pendingPayment.gatewayPaymentRef!,
      });
    }

    // 7. Create payment record BEFORE calling gateway (intent recording)
    const payment = PaymentEntity.create({
      orderId: order.id,
      amount: order.total,
      provider: command.paymentMethod,
    });

    try {
      await this.paymentRepository.save(payment);
    } catch (error) {
      this.logger.error(`Failed to record payment intent: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to process payment. Please try again.',
      });
    }

    // 8. Get payment provider and call gateway
    const provider = this.providerFactory.getProvider(command.paymentMethod);

    let paymentIntent;
    try {
      paymentIntent = await provider.createPaymentIntent(order);
    } catch (error) {
      this.logger.error(`Gateway error: ${error}`);
      // Mark the payment record as failed (gateway unreachable)
      payment.markAsFailure('GATEWAY_ERROR', 'Payment gateway unreachable');
      await this.paymentRepository.save(payment);
      return Result.fail({
        type: 'GATEWAY_ERROR',
        message: 'Payment gateway error. Please try again.',
      });
    }

    // 9. Update payment record with gateway reference
    payment.setGatewayPaymentRef(paymentIntent.id);
    if (paymentIntent.paymentUrl) {
      payment.setPaymentUrl(paymentIntent.paymentUrl);
    }
    if (paymentIntent.clientSecret) {
      payment.setClientSecret(paymentIntent.clientSecret);
    }

    // 10. Transition order to PROCESSING (if not already)
    if (order.isPending()) {
      const transitionResult = order.markAsProcessing(command.paymentMethod, paymentIntent.id);
      if (transitionResult.isFailure) {
        return Result.fail({
          type: 'INVALID_STATUS',
          message: transitionResult.error!.message,
        });
      }
    }

    // 11. Persist updated payment + order state
    try {
      await this.paymentRepository.save(payment);
      await this.orderRepository.save(order);
    } catch (error) {
      this.logger.error(`Failed to persist payment: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to process payment. Please try again.',
      });
    }

    // 12. Publish events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishMany(events);

    this.logger.log(`Payment initiated for order ${order.id} via ${command.paymentMethod}`);

    return Result.ok({
      paymentUrl: paymentIntent.paymentUrl,
      clientSecret: paymentIntent.clientSecret,
      orderId: order.id,
      gatewayRef: paymentIntent.id,
    });
  }
}
