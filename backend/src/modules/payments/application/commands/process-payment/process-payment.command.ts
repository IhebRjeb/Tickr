import { BaseCommand } from '@shared/application/interfaces/command.interface';

import { PaymentMethod } from '../../../domain/value-objects/payment-method.vo';

export type ProcessPaymentError =
  | { type: 'ORDER_NOT_FOUND'; message: string }
  | { type: 'ORDER_EXPIRED'; message: string }
  | { type: 'INVALID_STATUS'; message: string }
  | { type: 'MAX_ATTEMPTS_EXCEEDED'; message: string }
  | { type: 'GATEWAY_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export interface ProcessPaymentResult {
  readonly paymentUrl?: string;
  readonly clientSecret?: string;
  readonly orderId: string;
  readonly gatewayRef: string;
}

export class ProcessPaymentCommand extends BaseCommand {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly paymentMethod: PaymentMethod,
  ) {
    super();
    Object.freeze(this);
  }
}
