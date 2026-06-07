import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderRefundedEvent } from '../../domain/events/order-refunded.event';

/**
 * Infrastructure Event Handler: OrderRefunded
 *
 * Side effects after refund:
 * - Log refund for monitoring
 * - Future: send refund confirmation to user
 * - Future: notify organizer of refund
 */
@Injectable()
export class OrderRefundedInfraHandler {
  private readonly logger = new Logger(OrderRefundedInfraHandler.name);

  @OnEvent('OrderRefundedEvent')
  async handle(event: OrderRefundedEvent): Promise<void> {
    this.logger.log(
      `[Infra] Refund processed: order ${event.orderId}, amount ${event.amount} ${event.currency}`,
    );

    // TODO: Send refund confirmation email to user
    // TODO: Notify organizer of refund
  }
}
