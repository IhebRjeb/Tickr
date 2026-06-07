import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderPaidEvent } from '../../domain/events/order-paid.event';
import { ORDER_REPOSITORY } from '../ports/order.repository.port';
import type { OrderRepositoryPort } from '../ports/order.repository.port';
import { TICKET_RESERVATION_PORT } from '../ports/ticket-reservation.port';
import type { TicketReservationPort } from '../ports/ticket-reservation.port';

/**
 * Application Event Handler: OrderPaid
 *
 * Business reaction to successful payment:
 * - Confirms ticket reservations (changes RESERVED → CONFIRMED)
 *
 * This is a business logic handler (application layer).
 * Infrastructure side effects (email, logging) are in separate infra handlers.
 */
@Injectable()
export class OrderPaidAppHandler {
  private readonly logger = new Logger(OrderPaidAppHandler.name);

  constructor(
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  @OnEvent('OrderPaidEvent')
  async handle(event: OrderPaidEvent): Promise<void> {
    this.logger.log(`[App] OrderPaid: confirming tickets for order ${event.orderId}`);

    try {
      const order = await this.orderRepository.findById(event.orderId);
      if (!order) {
        this.logger.error(`Order ${event.orderId} not found for ticket confirmation`);
        return;
      }

      const ticketIds = order.items.map((item) => item.id);
      await this.ticketReservation.confirmTickets(ticketIds, event.orderId);

      this.logger.log(
        `Tickets confirmed for order ${event.orderId}: ${ticketIds.length} tickets`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to confirm tickets for order ${event.orderId}: ${error}`,
      );
    }
  }
}
