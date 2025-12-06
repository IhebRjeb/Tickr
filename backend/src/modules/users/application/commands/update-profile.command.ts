import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Command to update user profile
 *
 * Immutable command object following CQRS pattern
 */
export class UpdateProfileCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phone?: string | null,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Check if command has any changes
   */
  hasChanges(): boolean {
    return (
      this.firstName !== undefined ||
      this.lastName !== undefined ||
      this.phone !== undefined
    );
  }
}
