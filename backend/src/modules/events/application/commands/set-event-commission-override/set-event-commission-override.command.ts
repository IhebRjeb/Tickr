import { BaseCommand } from '@shared/application/interfaces/command.interface';

export type SetEventCommissionOverrideError =
  | { type: 'ACCESS_DENIED'; message: string }
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'INVALID_COMMISSION_RATE'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export interface SetEventCommissionOverrideResultCommand {
  readonly eventId: string;
  readonly commissionRateOverride: number | null;
  readonly effectiveCommissionRate: number;
  readonly usesGlobalRate: boolean;
}

export type SetEventCommissionOverrideResult =
  SetEventCommissionOverrideResultCommand;

export class SetEventCommissionOverrideCommand extends BaseCommand {
  constructor(
    public readonly eventId: string,
    public readonly adminId: string,
    public readonly commissionRateOverride: number | null,
  ) {
    super();
    Object.freeze(this);
  }
}