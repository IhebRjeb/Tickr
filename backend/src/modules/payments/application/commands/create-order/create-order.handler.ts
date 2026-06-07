import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Result } from '@shared/domain/result';
import { Money } from '@shared/domain/value-objects/money.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { OrderEntity } from '../../../domain/entities/order.entity';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import { PAYMENT_EVENT_QUERY_PORT } from '../../ports/event-query.port';
import { FRAUD_DETECTION_PORT } from '../../ports/fraud-detection.port';
import { TICKET_RESERVATION_PORT } from '../../ports/ticket-reservation.port';

import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import type { PaymentEventQueryPort } from '../../ports/event-query.port';
import type { FraudDetectionPort } from '../../ports/fraud-detection.port';
import type { TicketReservationPort } from '../../ports/ticket-reservation.port';

import {
  CreateOrderCommand,
  CreateOrderError,
  CreateOrderResult,
} from './create-order.command';

@Injectable()
export class CreateOrderHandler {
  private readonly logger = new Logger(CreateOrderHandler.name);
  private readonly commissionRate: number;
  private readonly expirationMinutes: number;

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(PAYMENT_EVENT_QUERY_PORT)
    private readonly eventQuery: PaymentEventQueryPort,
    @Inject(FRAUD_DETECTION_PORT)
    private readonly fraudDetection: FraudDetectionPort,
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly configService: ConfigService,
  ) {
    this.commissionRate = this.configService.get<number>('PLATFORM_COMMISSION_RATE', 0.06);
    this.expirationMinutes = this.configService.get<number>('ORDER_EXPIRATION_MINUTES', 15);
  }

  async execute(
    command: CreateOrderCommand,
  ): Promise<Result<CreateOrderResult, CreateOrderError>> {
    this.logger.debug(`Creating order for user ${command.userId}, event ${command.eventId}`);

    // 1. Fraud check: rate limit
    const withinRateLimit = await this.fraudDetection.checkRateLimit(command.userId);
    if (!withinRateLimit) {
      return Result.fail({
        type: 'RATE_LIMITED',
        message: 'Too many orders. Please wait before placing another order.',
      });
    }

    // 2. Validate event exists and is published
    const event = await this.eventQuery.getEventById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event ${command.eventId} not found`,
      });
    }
    if (event.status !== 'PUBLISHED') {
      return Result.fail({
        type: 'EVENT_NOT_PUBLISHED',
        message: 'Event is not available for ticket purchase',
      });
    }

    // 3. Validate items and build order items
    const orderItems = [];
    const allHolders: { ticketTypeId: string; holders: { name: string; email: string }[] }[] = [];

    for (const item of command.items) {
      const ticketType = await this.eventQuery.getTicketType(item.ticketTypeId);
      if (!ticketType) {
        return Result.fail({
          type: 'TICKET_TYPE_NOT_FOUND',
          message: `Ticket type ${item.ticketTypeId} not found`,
        });
      }

      if (ticketType.available < item.quantity) {
        return Result.fail({
          type: 'INSUFFICIENT_AVAILABILITY',
          message: `Only ${ticketType.available} tickets available for ${ticketType.name}`,
        });
      }

      // Fraud check: ticket limit per event
      const withinTicketLimit = await this.fraudDetection.checkTicketLimit(
        command.userId,
        command.eventId,
        item.quantity,
      );
      if (!withinTicketLimit) {
        return Result.fail({
          type: 'TICKET_LIMIT_EXCEEDED',
          message: 'Maximum tickets per event exceeded',
        });
      }

      orderItems.push({
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: ticketType.name,
        price: Money.create(ticketType.price, ticketType.currency),
        quantity: item.quantity,
      });

      allHolders.push({ ticketTypeId: item.ticketTypeId, holders: item.holders });
    }

    // 4. Create the order aggregate
    const orderResult = OrderEntity.create({
      userId: command.userId,
      eventId: command.eventId,
      items: orderItems,
      currency: orderItems[0].price.currency,
      commissionRate: this.commissionRate,
      expirationMinutes: this.expirationMinutes,
      metadata: command.metadata,
    });

    if (orderResult.isFailure) {
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message: orderResult.error!.message,
      });
    }

    const order = orderResult.value;

    // 5. Reserve tickets via Tickets module
    try {
      for (const item of allHolders) {
        await this.ticketReservation.reserveTickets(
          command.eventId,
          item.ticketTypeId,
          command.userId,
          item.holders.length,
          item.holders,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to reserve tickets: ${error}`);
      return Result.fail({
        type: 'INSUFFICIENT_AVAILABILITY',
        message: 'Failed to reserve tickets. Please try again.',
      });
    }

    // 6. Persist order
    try {
      await this.orderRepository.save(order);
    } catch (error) {
      this.logger.error(`Failed to save order: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to create order. Please try again.',
      });
    }

    // 7. Publish domain events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishMany(events);

    this.logger.log(`Order ${order.id} created successfully`);

    return Result.ok({
      orderId: order.id,
      subtotal: order.subtotalAmount,
      platformFee: order.platformFeeAmount,
      total: order.totalAmount,
      currency: order.currency,
      expiresAt: order.expiresAt,
    });
  }
}
