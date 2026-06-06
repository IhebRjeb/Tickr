import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { OrderPaidEvent } from '../../domain/events/order-paid.event';

/**
 * Infrastructure Event Handler: OrderPaid
 *
 * Side effects after successful payment:
 * - Log successful payment
 * - Future: send payment confirmation email/SMS
 * - Future: trigger analytics event
 */
@Injectable()
export class OrderPaidInfraHandler {
  private readonly logger = new Logger(OrderPaidInfraHandler.name);

  @OnEvent('OrderPaidEvent')
  async handle(event: OrderPaidEvent): Promise<void> {
    this.logger.log(
      `[Infra] Payment confirmed: order ${event.orderId}, txn ${event.transactionId}, ` +
        `amount ${event.totalAmount} ${event.currency}`,
    );

    // TODO: Send payment confirmation email
    // TODO: Send SMS notification
    // TODO: Publish to analytics
  }
}
