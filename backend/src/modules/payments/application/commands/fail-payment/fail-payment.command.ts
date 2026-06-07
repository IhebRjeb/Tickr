import { BaseCommand } from '@shared/application/interfaces/command.interface';

export type FailPaymentError =
  | { type: 'ORDER_NOT_FOUND'; message: string }
  | { type: 'INVALID_STATUS'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export type FailPaymentResult = {
  readonly canRetry: boolean;
  readonly attemptNumber: number;
};

export class FailPaymentCommand extends BaseCommand {
  constructor(
    public readonly orderId: string,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly gatewayResponse?: Record<string, unknown>,
  ) {
    super();
    Object.freeze(this);
  }
}
