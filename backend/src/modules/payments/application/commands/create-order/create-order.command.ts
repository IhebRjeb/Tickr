import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types
// ============================================

export interface OrderItemInput {
  readonly ticketTypeId: string;
  readonly quantity: number;
  readonly holders: { name: string; email: string }[];
}

export type CreateOrderError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'EVENT_NOT_PUBLISHED'; message: string }
  | { type: 'TICKET_TYPE_NOT_FOUND'; message: string }
  | { type: 'INSUFFICIENT_AVAILABILITY'; message: string }
  | { type: 'RATE_LIMITED'; message: string }
  | { type: 'TICKET_LIMIT_EXCEEDED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export interface CreateOrderResult {
  readonly orderId: string;
  readonly subtotal: number;
  readonly platformFee: number;
  readonly total: number;
  readonly currency: string;
  readonly expiresAt: Date;
}

// ============================================
// Command
// ============================================

export class CreateOrderCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly eventId: string,
    public readonly items: OrderItemInput[],
    public readonly metadata: {
      holderFirstName: string;
      holderLastName: string;
      holderEmail: string;
    },
  ) {
    super();
    Object.freeze(this);
  }
}
