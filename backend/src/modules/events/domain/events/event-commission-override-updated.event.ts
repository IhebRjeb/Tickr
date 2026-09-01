import { DomainEvent } from '@shared/domain/domain-event.base';

export class EventCommissionOverrideUpdatedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly adminId: string,
    public readonly previousRate: number | null,
    public readonly newRate: number | null,
    public readonly updatedAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId,
      adminId: this.adminId,
      previousRate: this.previousRate,
      newRate: this.newRate,
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}