import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { PaymentEntity } from '../../../domain/entities/payment.entity';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import { PAYMENT_REPOSITORY } from '../../ports/payment.repository.port';
import { TICKET_RESERVATION_PORT } from '../../ports/ticket-reservation.port';

import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import type { PaymentRepositoryPort } from '../../ports/payment.repository.port';
import type { TicketReservationPort } from '../../ports/ticket-reservation.port';

import { FailPaymentCommand, FailPaymentError, FailPaymentResult } from './fail-payment.command';

@Injectable()
export class FailPaymentHandler {
  private readonly logger = new Logger(FailPaymentHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryPort,
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: FailPaymentCommand,
  ): Promise<Result<FailPaymentResult, FailPaymentError>> {
    this.logger.debug(`Payment failed for order ${command.orderId}: ${command.errorCode}`);

    // 1. Find order
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order ${command.orderId} not found`,
      });
    }

    // 2. Update payment record
    const payments = await this.paymentRepository.findByOrderId(command.orderId);
    const pendingPayment = payments.find((p) => p.isPending());
    if (pendingPayment) {
      pendingPayment.markAsFailed(command.errorCode, command.errorMessage, command.gatewayResponse);
      await this.paymentRepository.save(pendingPayment);
    }

    // 3. Check if max attempts reached
    const attemptCount = payments.length;
    const canRetry = attemptCount < PaymentEntity.MAX_ATTEMPTS;

    if (!canRetry) {
      // Final failure — mark order as FAILED and release tickets
      const failResult = order.markAsFailed(command.errorMessage);
      if (failResult.isFailure) {
        return Result.fail({
          type: 'INVALID_STATUS',
          message: failResult.error!.message,
        });
      }

      // Release ticket reservations
      try {
        const ticketIds = order.items.map((item) => item.id);
        await this.ticketReservation.cancelReservations(ticketIds);
      } catch (error) {
        this.logger.error(`Failed to release tickets: ${error}`);
      }
    }
    // If can retry, order stays in PROCESSING — user can submit another payment attempt

    // 4. Persist
    try {
      await this.orderRepository.save(order);
    } catch (error) {
      this.logger.error(`Failed to save order: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to update order after payment failure',
      });
    }

    // 5. Publish events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishMany(events);

    this.logger.log(
      `Payment failed for order ${order.id}. Attempt ${attemptCount}/${PaymentEntity.MAX_ATTEMPTS}. Can retry: ${canRetry}`,
    );

    return Result.ok({
      canRetry,
      attemptNumber: attemptCount,
    });
  }
}
