import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderCreatedEvent } from '../../domain/events/order-created.event';

/**
 * Infrastructure Event Handler: OrderCreated
 *
 * Side effects after order creation:
 * - Logs order creation for analytics/monitoring
 *
 * Future: send order confirmation email, push notification
 */
@Injectable()
export class OrderCreatedInfraHandler {
  private readonly logger = new Logger(OrderCreatedInfraHandler.name);

  @OnEvent('OrderCreatedEvent')
  async handle(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `[Infra] Order created: ${event.orderId} by user ${event.userId} for event ${event.eventId}`,
    );
  }
}
