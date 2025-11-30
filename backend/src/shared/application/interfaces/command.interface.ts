/**
 * Command interface for CQRS pattern
 *
 * Commands represent intentions to change state
 */

export interface ICommand {
  readonly timestamp: Date;
}

export abstract class BaseCommand implements ICommand {
  public readonly timestamp: Date;

  constructor() {
    this.timestamp = new Date();
  }
}
