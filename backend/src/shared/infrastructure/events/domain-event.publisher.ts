import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DomainEvent } from '../../domain/domain-event.base';

import { EventStoreService } from './event-store.service';

/**
 * Domain Event Publisher
 * 
 * Publishes domain events with outbox pattern for reliability
 */
@Injectable()
export class DomainEventPublisher {
  private readonly logger = new Logger(DomainEventPublisher.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventStore: EventStoreService,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    try {
      // Store event first (outbox pattern)
      await this.eventStore.store(event);

      // Then publish
      this.eventEmitter.emit(event.eventName, event);
      this.logger.log(`Published event: ${event.eventName} for aggregate ${event.eventId}`);

      // Mark as published
      await this.eventStore.markAsPublished(event.eventId);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.eventName}`, error);
      throw error;
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async publishFromAggregate(aggregate: { pullDomainEvents(): DomainEvent[] }): Promise<void> {
    const events = aggregate.pullDomainEvents();
    await this.publishMany(events);
  }
}
