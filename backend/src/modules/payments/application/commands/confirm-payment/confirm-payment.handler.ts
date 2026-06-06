import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import { PAYMENT_REPOSITORY } from '../../ports/payment.repository.port';
import { TICKET_RESERVATION_PORT } from '../../ports/ticket-reservation.port';

import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import type { PaymentRepositoryPort } from '../../ports/payment.repository.port';
import type { TicketReservationPort } from '../../ports/ticket-reservation.port';

import { ConfirmPaymentCommand, ConfirmPaymentError } from './confirm-payment.command';

@Injectable()
export class ConfirmPaymentHandler {
  private readonly logger = new Logger(ConfirmPaymentHandler.name);

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
    command: ConfirmPaymentCommand,
  ): Promise<Result<void, ConfirmPaymentError>> {
    this.logger.debug(`Confirming payment for order ${command.orderId}`);

    // 1. Find order
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order ${command.orderId} not found`,
      });
    }

    // 2. Mark order as paid
    const paidResult = order.markAsPaid(command.transactionId, command.gatewayRef);
    if (paidResult.isFailure) {
      return Result.fail({
        type: 'INVALID_STATUS',
        message: paidResult.error!.message,
      });
    }

    // 3. Update payment record
    const payments = await this.paymentRepository.findByOrderId(command.orderId);
    const pendingPayment = payments.find((p) => p.isPending());
    if (pendingPayment) {
      pendingPayment.markAsSuccess(command.gatewayResponse, command.gatewayRef);
      await this.paymentRepository.save(pendingPayment);
    }

    // 4. Confirm ticket reservations
    try {
      const ticketIds = order.items.map((item) => item.id);
      await this.ticketReservation.confirmTickets(ticketIds, order.id);
    } catch (error) {
      this.logger.error(`Failed to confirm tickets: ${error}`);
      // Payment is confirmed — tickets will be confirmed via retry/event handler
    }

    // 5. Persist order
    try {
      await this.orderRepository.save(order);
    } catch (error) {
      this.logger.error(`Failed to save confirmed order: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to confirm order',
      });
    }

    // 6. Publish events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishAll(events);

    this.logger.log(`Order ${order.id} payment confirmed (tx: ${command.transactionId})`);

    return Result.okVoid();
  }
}
