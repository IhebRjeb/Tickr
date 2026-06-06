import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { Money } from '@shared/domain/value-objects/money.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { RefundEntity } from '../../../domain/entities/refund.entity';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import { REFUND_REPOSITORY } from '../../ports/refund.repository.port';
import { PAYMENT_PROVIDER_FACTORY } from '../../ports/payment-provider.port';
import { TICKET_RESERVATION_PORT } from '../../ports/ticket-reservation.port';

import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import type { RefundRepositoryPort } from '../../ports/refund.repository.port';
import type { PaymentProviderFactoryPort } from '../../ports/payment-provider.port';
import type { TicketReservationPort } from '../../ports/ticket-reservation.port';

import { RequestRefundCommand, RequestRefundError, RequestRefundResult } from './request-refund.command';

@Injectable()
export class RequestRefundHandler {
  private readonly logger = new Logger(RequestRefundHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(REFUND_REPOSITORY)
    private readonly refundRepository: RefundRepositoryPort,
    @Inject(PAYMENT_PROVIDER_FACTORY)
    private readonly providerFactory: PaymentProviderFactoryPort,
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: RequestRefundCommand,
  ): Promise<Result<RequestRefundResult, RequestRefundError>> {
    this.logger.debug(`Refund requested for order ${command.orderId}`);

    // 1. Find order
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order ${command.orderId} not found`,
      });
    }

    // 2. Validate refundable status
    if (!order.canBeRefunded()) {
      return Result.fail({
        type: 'INVALID_STATUS',
        message: `Order in ${order.status} status cannot be refunded`,
      });
    }

    // 3. Calculate refund amount (total minus platform fee — commission non-refundable)
    const refundAmount = Money.create(
      order.subtotalAmount + order.paymentFeesAmount,
      order.currency,
    );

    // 4. Create refund entity
    const refund = RefundEntity.create({
      orderId: order.id,
      amount: refundAmount,
      reason: command.reason,
    });

    // 5. Attempt refund with gateway
    if (order.paymentMethod) {
      try {
        const provider = this.providerFactory.getProvider(order.paymentMethod);
        const gatewayRef = order.gatewayPaymentRef || order.transactionId || '';
        const refundResult = await provider.refund(gatewayRef, refundAmount);

        if (refundResult.success) {
          refund.markAsCompleted(refundResult.refundId);
        } else {
          refund.markAsFailed();
          this.logger.warn(`Gateway refund failed for order ${order.id}`);
        }
      } catch (error) {
        // Konnect throws for manual refunds — mark as pending for manual processing
        this.logger.warn(`Refund requires manual processing: ${error}`);
      }
    }

    // 6. Mark order as refunded
    const refundedResult = order.markAsRefunded(command.reason);
    if (refundedResult.isFailure) {
      return Result.fail({
        type: 'INVALID_STATUS',
        message: refundedResult.error!.message,
      });
    }

    // 7. Cancel tickets
    try {
      const ticketIds = order.items.map((item) => item.id);
      await this.ticketReservation.cancelReservations(ticketIds);
    } catch (error) {
      this.logger.error(`Failed to cancel tickets on refund: ${error}`);
    }

    // 8. Persist
    try {
      await this.refundRepository.save(refund);
      await this.orderRepository.save(order);
    } catch (error) {
      this.logger.error(`Failed to save refund: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to process refund',
      });
    }

    // 9. Publish events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishMany(events);

    this.logger.log(`Refund ${refund.id} processed for order ${order.id}`);

    return Result.ok({
      refundId: refund.id,
      status: refund.status,
    });
  }
}
