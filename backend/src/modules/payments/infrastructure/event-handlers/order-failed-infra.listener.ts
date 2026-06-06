import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderFailedEvent } from '../../domain/events/order-failed.event';

/**
 * Infrastructure Event Handler: OrderFailed
 *
 * Side effects after payment failure:
 * - Log failure for monitoring
 * - Future: send failure notification to user
 */
@Injectable()
export class OrderFailedInfraHandler {
  private readonly logger = new Logger(OrderFailedInfraHandler.name);

  @OnEvent('OrderFailedEvent')
  async handle(event: OrderFailedEvent): Promise<void> {
    this.logger.log(
      `[Infra] Payment failed: order ${event.orderId}, reason: ${event.reason}`,
    );

    // TODO: Send payment failure notification to user
    // TODO: Suggest retry or alternative payment method
  }
}
