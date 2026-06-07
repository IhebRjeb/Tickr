import type { DomainEvent } from '../../domain/domain-event.base';

/**
 * Injection token for DomainEventPublisher
 */
export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');

/**
 * Domain Event Publisher Port
 *
 * Defines the contract for publishing domain events.
 * Application layer depends on this port; infrastructure provides the adapter.
 */
export interface DomainEventPublisherPort {
  /**
   * Publish a single domain event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple domain events
   */
  publishMany(events: DomainEvent[]): Promise<void>;

  /**
   * Pull and publish all pending domain events from an aggregate root
   */
  publishFromAggregate(aggregate: {
    pullDomainEvents(): DomainEvent[];
  }): Promise<void>;
}
