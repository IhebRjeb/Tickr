import { Inject, Injectable, Logger } from '@nestjs/common';

import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import { TICKET_RESERVATION_PORT } from '../../ports/ticket-reservation.port';

import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import type { TicketReservationPort } from '../../ports/ticket-reservation.port';

import { ExpireOrdersResult } from './expire-orders.command';

@Injectable()
export class ExpireOrdersHandler {
  private readonly logger = new Logger(ExpireOrdersHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(): Promise<ExpireOrdersResult> {
    this.logger.debug('Running order expiration job');

    const expiredOrders = await this.orderRepository.findExpired();

    if (expiredOrders.length === 0) {
      return { expiredCount: 0 };
    }

    let expiredCount = 0;

    for (const order of expiredOrders) {
      try {
        const expireResult = order.expire();
        if (expireResult.isFailure) {
          this.logger.warn(`Cannot expire order ${order.id}: ${expireResult.error!.message}`);
          continue;
        }

        // Release ticket reservations
        try {
          const ticketIds = order.items.map((item) => item.id);
          await this.ticketReservation.cancelReservations(ticketIds);
        } catch (error) {
          this.logger.error(`Failed to release tickets for order ${order.id}: ${error}`);
        }

        await this.orderRepository.save(order);

        const events = order.pullDomainEvents();
        await this.eventPublisher.publishMany(events);

        expiredCount++;
      } catch (error) {
        this.logger.error(`Failed to expire order ${order.id}: ${error}`);
      }
    }

    this.logger.log(`Expired ${expiredCount}/${expiredOrders.length} orders`);

    return { expiredCount };
  }
}
