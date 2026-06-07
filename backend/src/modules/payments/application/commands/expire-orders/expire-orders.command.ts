import { BaseCommand } from '@shared/application/interfaces/command.interface';

export type ExpireOrdersResult = {
  readonly expiredCount: number;
};

export class ExpireOrdersCommand extends BaseCommand {
  constructor() {
    super();
    Object.freeze(this);
  }
}
