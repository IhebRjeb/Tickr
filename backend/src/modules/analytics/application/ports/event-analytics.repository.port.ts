import type { EventAnalyticsEntity } from '../../domain/entities/event-analytics.entity';

/**
 * Injection token for EventAnalyticsRepository
 */
export const EVENT_ANALYTICS_REPOSITORY = Symbol('EVENT_ANALYTICS_REPOSITORY');

/**
 * Event Analytics Repository Port
 *
 * Defines the contract for event analytics persistence.
 * This is a read-model repository (materialized views).
 */
export interface EventAnalyticsRepositoryPort {
  save(entity: EventAnalyticsEntity): Promise<EventAnalyticsEntity>;

  findByEventId(eventId: string): Promise<EventAnalyticsEntity | null>;

  findByOrganizerId(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<{ data: EventAnalyticsEntity[]; total: number }>;

  deleteByEventId(eventId: string): Promise<void>;
}
