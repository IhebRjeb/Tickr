import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EntityType } from '../../domain/value-objects/entity-type.vo';
import { MetricType } from '../../domain/value-objects/metric-type.vo';
import { RecordMetricCommand } from '../../application/commands/record-metric/record-metric.command';
import { RecordMetricHandler } from '../../application/commands/record-metric/record-metric.handler';

/**
 * Cross-Module Event Handler (Infrastructure)
 *
 * Listens to infrastructure-level events from other modules
 * that don't have a dedicated application event handler.
 *
 * Records CHECK_IN and REFUND metrics from ticket/payment events.
 */
@Injectable()
export class CrossModuleEventListener {
  private readonly logger = new Logger(CrossModuleEventListener.name);

  constructor(
    private readonly recordMetricHandler: RecordMetricHandler,
  ) {}

  /**
   * When a ticket is checked in, record CHECK_IN metric
   */
  @OnEvent('TicketCheckedInEvent')
  async onTicketCheckedIn(payload: {
    ticketId: string;
    eventId: string;
    userId: string;
  }): Promise<void> {
    this.logger.debug(`Ticket checked in: ${payload.ticketId}`);

    const result = await this.recordMetricHandler.execute(
      new RecordMetricCommand(
        MetricType.CHECK_IN,
        payload.eventId,
        EntityType.EVENT,
        1,
        'count',
        { ticketId: payload.ticketId, userId: payload.userId },
      ),
    );

    if (result.isFailure) {
      this.logger.warn(
        `Failed to record check-in metric: ${result.error.message}`,
      );
    }
  }

  /**
   * When an order is refunded, record REFUND metric
   */
  @OnEvent('OrderRefundedEvent')
  async onOrderRefunded(payload: {
    orderId: string;
    eventId: string;
    refundAmount: number;
    currency: string;
  }): Promise<void> {
    this.logger.debug(`Order refunded: ${payload.orderId}`);

    const result = await this.recordMetricHandler.execute(
      new RecordMetricCommand(
        MetricType.REFUND,
        payload.eventId,
        EntityType.EVENT,
        payload.refundAmount,
        payload.currency,
        { orderId: payload.orderId },
      ),
    );

    if (result.isFailure) {
      this.logger.warn(
        `Failed to record refund metric: ${result.error.message}`,
      );
    }
  }
}
