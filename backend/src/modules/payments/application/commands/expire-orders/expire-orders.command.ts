import { BaseCommand } from '@shared/application/interfaces/command.interface';

export interface ExpireOrdersResult {
  readonly expiredCount: number;
}

export class ExpireOrdersCommand extends BaseCommand {
  constructor() {
    super();
    Object.freeze(this);
  }
}
