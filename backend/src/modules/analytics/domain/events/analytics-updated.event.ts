import { DomainEvent } from '@shared/domain/domain-event.base';

import { EntityType } from '../value-objects/entity-type.vo';

/**
 * Emitted when a materialized analytics view is refreshed.
 */
export class AnalyticsUpdatedEvent extends DomainEvent {
  constructor(
    public readonly entityType: EntityType,
    public readonly entityId: string,
    public readonly updatedAt: Date,
  ) {
    super();
  }
}
