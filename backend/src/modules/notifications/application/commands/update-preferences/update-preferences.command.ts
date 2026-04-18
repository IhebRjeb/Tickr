import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Error types for UpdatePreferences operation
 */
export type UpdatePreferencesError =
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for UpdatePreferences operation
 */
export interface UpdatePreferencesResultCommand {
  readonly userId: string;
  readonly emailEnabled: boolean;
  readonly smsEnabled: boolean;
  readonly marketingEnabled: boolean;
  readonly eventRemindersEnabled: boolean;
}

/**
 * Command to update a user's notification preferences
 */
export class UpdatePreferencesCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly emailEnabled?: boolean,
    public readonly smsEnabled?: boolean,
    public readonly marketingEnabled?: boolean,
    public readonly eventRemindersEnabled?: boolean,
  ) {
    super();
    Object.freeze(this);
  }
}
