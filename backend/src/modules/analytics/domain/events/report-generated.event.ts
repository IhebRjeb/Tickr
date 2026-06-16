import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a report is successfully generated and uploaded.
 */
export class ReportGeneratedEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly reportType: string,
    public readonly format: string,
    public readonly url: string,
  ) {
    super();
  }
}
