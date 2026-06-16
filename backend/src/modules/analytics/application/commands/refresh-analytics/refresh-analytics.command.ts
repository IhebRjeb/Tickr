import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types
// ============================================

export type RefreshAnalyticsError =
  | { type: 'REFRESH_FAILED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export type RefreshAnalyticsResult = {
  readonly refreshedEvents: number;
  readonly platformUpdated: boolean;
};

// ============================================
// Command
// ============================================

export class RefreshAnalyticsCommand extends BaseCommand {
  constructor(
    public readonly targetType?: 'event' | 'platform',
  ) {
    super();
    Object.freeze(this);
  }
}
