import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Command to deactivate a user account
 *
 * Immutable command object following CQRS pattern
 */
export class DeactivateUserCommand extends BaseCommand {
  constructor(public readonly userId: string) {
    super();
    Object.freeze(this);
  }
}
