import { BaseCommand } from '@shared/application/interfaces/command.interface';

export type RequestRefundError =
  | { type: 'ORDER_NOT_FOUND'; message: string }
  | { type: 'INVALID_STATUS'; message: string }
  | { type: 'REFUND_NOT_ALLOWED'; message: string }
  | { type: 'GATEWAY_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export type RequestRefundResult = {
  readonly refundId: string;
  readonly status: string;
};

export class RequestRefundCommand extends BaseCommand {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly reason: string,
  ) {
    super();
    Object.freeze(this);
  }
}
