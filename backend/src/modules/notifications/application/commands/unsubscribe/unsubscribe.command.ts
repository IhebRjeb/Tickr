import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Error types for Unsubscribe operation
 */
export type UnsubscribeError =
  | { type: 'INVALID_TOKEN'; message: string }
  | { type: 'NOT_ALLOWED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Command to unsubscribe from a notification category via email link
 */
export class UnsubscribeCommand extends BaseCommand {
  constructor(
    public readonly token: string,
    public readonly category: 'marketing' | 'event_reminders',
  ) {
    super();
    Object.freeze(this);
  }
}
