import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EntityType } from '../../domain/value-objects/entity-type.vo';
import { MetricType } from '../../domain/value-objects/metric-type.vo';
import { RecordMetricCommand } from '../commands/record-metric/record-metric.command';
import { RecordMetricHandler } from '../commands/record-metric/record-metric.handler';

/**
 * Application Event Handlers
 *
 * Listens to domain events from other modules (Payments, Events, Users)
 * and records corresponding metric data points.
 *
 * Integration points between bounded contexts.
 * Uses only event payload data — no cross-module domain imports.
 */
@Injectable()
export class AnalyticsEventListener {
  private readonly logger = new Logger(AnalyticsEventListener.name);

  constructor(
    private readonly recordMetricHandler: RecordMetricHandler,
  ) {}

  /**
   * When an order is paid, record REVENUE and TICKET_SOLD metrics
   */
  @OnEvent('OrderPaidEvent')
  async onOrderPaid(payload: {
    orderId: string;
    eventId: string;
    userId: string;
    totalAmount: number;
    subtotalAmount: number;
    platformFeeAmount: number;
    currency: string;
    ticketCount: number;
  }): Promise<void> {
    this.logger.debug(`Order paid: ${payload.orderId}, recording metrics`);

    // Record revenue metric
    const revenueResult = await this.recordMetricHandler.execute(
      new RecordMetricCommand(
        MetricType.REVENUE,
        payload.eventId,
        EntityType.EVENT,
        payload.subtotalAmount,
        payload.currency,
        {
          orderId: payload.orderId,
          userId: payload.userId,
          totalAmount: payload.totalAmount,
          platformFeeAmount: payload.platformFeeAmount,
        },
      ),
    );

    if (revenueResult.isFailure) {
      this.logger.warn(
        `Failed to record revenue metric: ${revenueResult.error.message}`,
      );
    }

    // Record ticket sold metric
    const ticketResult = await this.recordMetricHandler.execute(
      new RecordMetricCommand(
        MetricType.TICKET_SOLD,
        payload.eventId,
        EntityType.EVENT,
        payload.ticketCount,
        'units',
        { orderId: payload.orderId },
      ),
    );

    if (ticketResult.isFailure) {
      this.logger.warn(
        `Failed to record ticket sold metric: ${ticketResult.error.message}`,
      );
    }
  }

  /**
   * When an event is published, record EVENT_CREATED metric
   */
  @OnEvent('EventPublishedEvent')
  async onEventPublished(payload: {
    eventId: string;
    organizerId: string;
    title: string;
  }): Promise<void> {
    this.logger.debug(`Event published: ${payload.eventId}, recording metric`);

    const result = await this.recordMetricHandler.execute(
      new RecordMetricCommand(
        MetricType.EVENT_CREATED,
        payload.eventId,
        EntityType.EVENT,
        1,
        'count',
        { organizerId: payload.organizerId, title: payload.title },
      ),
    );

    if (result.isFailure) {
      this.logger.warn(
        `Failed to record event created metric: ${result.error.message}`,
      );
    }
  }

  /**
   * When a user registers, record USER_REGISTERED metric
   */
  @OnEvent('UserCreatedEvent')
  async onUserRegistered(payload: {
    userId: string;
    role: string;
  }): Promise<void> {
    this.logger.debug(`User registered: ${payload.userId}, recording metric`);

    const result = await this.recordMetricHandler.execute(
      new RecordMetricCommand(
        MetricType.USER_REGISTERED,
        payload.userId,
        EntityType.USER,
        1,
        'count',
        { role: payload.role },
      ),
    );

    if (result.isFailure) {
      this.logger.warn(
        `Failed to record user registered metric: ${result.error.message}`,
      );
    }
  }
}
