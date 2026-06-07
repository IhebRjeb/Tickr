import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderFailedEvent } from '../../domain/events/order-failed.event';
import { ORDER_REPOSITORY } from '../ports/order.repository.port';
import type { OrderRepositoryPort } from '../ports/order.repository.port';
import { TICKET_RESERVATION_PORT } from '../ports/ticket-reservation.port';
import type { TicketReservationPort } from '../ports/ticket-reservation.port';

/**
 * Application Event Handler: OrderFailed
 *
 * Business reaction to payment failure:
 * - Releases ticket reservations back to available pool
 *
 * This is a business logic handler (application layer).
 * Infrastructure side effects (notifications) are in separate infra handlers.
 */
@Injectable()
export class OrderFailedAppHandler {
  private readonly logger = new Logger(OrderFailedAppHandler.name);

  constructor(
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  @OnEvent('OrderFailedEvent')
  async handle(event: OrderFailedEvent): Promise<void> {
    this.logger.log(
      `[App] OrderFailed: releasing tickets for order ${event.orderId}`,
    );

    try {
      const order = await this.orderRepository.findById(event.orderId);
      if (!order) {
        this.logger.error(`Order ${event.orderId} not found for ticket release`);
        return;
      }

      const ticketIds = order.items.map((item) => item.id);
      await this.ticketReservation.cancelReservations(ticketIds);

      this.logger.log(
        `Tickets released for order ${event.orderId}: ${ticketIds.length} tickets`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to release tickets for order ${event.orderId}: ${error}`,
      );
    }
  }
}
