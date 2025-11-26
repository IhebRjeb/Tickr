import { Injectable, Logger } from '@nestjs/common';

import { DomainEvent } from '../../domain/domain-event.base';

interface StoredEvent {
  eventId: string;
  eventName: string;
  payload: Record<string, unknown>;
  occurredOn: Date;
  publishedAt?: Date;
  retryCount: number;
}

/**
 * Event Store Service
 * 
 * Implements outbox pattern for reliable event publishing
 * Stores events before publishing and supports retry mechanism
 */
@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private readonly events: Map<string, StoredEvent> = new Map();

  async store(event: DomainEvent): Promise<void> {
    const storedEvent: StoredEvent = {
      eventId: event.eventId,
      eventName: event.eventName,
      payload: event.toJSON(),
      occurredOn: event.occurredOn,
      retryCount: 0,
    };

    this.events.set(event.eventId, storedEvent);
    this.logger.debug(`Stored event: ${event.eventId}`);
  }

  async markAsPublished(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      event.publishedAt = new Date();
      this.logger.debug(`Marked event as published: ${eventId}`);
    }
  }

  async getUnpublishedEvents(): Promise<StoredEvent[]> {
    return Array.from(this.events.values()).filter(
      (event) => !event.publishedAt && event.retryCount < 3,
    );
  }

  async incrementRetryCount(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      event.retryCount++;
    }
  }

  async getEventsByName(eventName: string): Promise<StoredEvent[]> {
    return Array.from(this.events.values())
      .filter((event) => event.eventName === eventName)
      .sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());
  }
}
