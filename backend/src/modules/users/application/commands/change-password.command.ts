import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Command to change user password
 *
 * Immutable command object following CQRS pattern
 */
export class ChangePasswordCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {
    super();
    Object.freeze(this);
  }
}
