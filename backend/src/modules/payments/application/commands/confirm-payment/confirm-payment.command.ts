import { BaseCommand } from '@shared/application/interfaces/command.interface';

export type ConfirmPaymentError =
  | { type: 'ORDER_NOT_FOUND'; message: string }
  | { type: 'INVALID_STATUS'; message: string }
  | { type: 'GATEWAY_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export class ConfirmPaymentCommand extends BaseCommand {
  constructor(
    public readonly orderId: string,
    public readonly gatewayRef: string,
    public readonly transactionId: string,
    public readonly gatewayResponse: Record<string, unknown>,
  ) {
    super();
    Object.freeze(this);
  }
}
