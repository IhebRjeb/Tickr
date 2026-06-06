import { generateUUID } from '@shared/domain/utils';
import { Money } from '@shared/domain/value-objects/money.vo';

/**
 * Props for creating a new OrderItem
 */
export interface CreateOrderItemProps {
  ticketTypeId: string;
  ticketTypeName: string;
  price: Money;
  quantity: number;
}

/**
 * Props for reconstituting an OrderItem from persistence
 */
export interface OrderItemProps {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  priceAmount: number;
  priceCurrency: string;
  quantity: number;
  createdAt: Date;
}

/**
 * Order Item (Sub-entity)
 *
 * Represents a line item in an order — a ticket type with quantity.
 * Immutable after creation (price frozen at order time).
 */
export class OrderItemEntity {
  private readonly _id: string;
  private readonly _ticketTypeId: string;
  private readonly _ticketTypeName: string;
  private readonly _priceAmount: number;
  private readonly _priceCurrency: string;
  private readonly _quantity: number;
  private readonly _createdAt: Date;

  private constructor(props: OrderItemProps) {
    this._id = props.id;
    this._ticketTypeId = props.ticketTypeId;
    this._ticketTypeName = props.ticketTypeName;
    this._priceAmount = props.priceAmount;
    this._priceCurrency = props.priceCurrency;
    this._quantity = props.quantity;
    this._createdAt = props.createdAt;
  }

  // ============================================
  // Static Factories
  // ============================================

  static create(props: CreateOrderItemProps): OrderItemEntity {
    return new OrderItemEntity({
      id: generateUUID(),
      ticketTypeId: props.ticketTypeId,
      ticketTypeName: props.ticketTypeName,
      priceAmount: props.price.amount,
      priceCurrency: props.price.currency,
      quantity: props.quantity,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: OrderItemProps): OrderItemEntity {
    return new OrderItemEntity(props);
  }

  // ============================================
  // Getters
  // ============================================

  get id(): string {
    return this._id;
  }

  get ticketTypeId(): string {
    return this._ticketTypeId;
  }

  get ticketTypeName(): string {
    return this._ticketTypeName;
  }

  get priceAmount(): number {
    return this._priceAmount;
  }

  get priceCurrency(): string {
    return this._priceCurrency;
  }

  get quantity(): number {
    return this._quantity;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Get the price as a Money value object
   */
  get price(): Money {
    return Money.create(this._priceAmount, this._priceCurrency);
  }

  /**
   * Calculate line total (price × quantity)
   */
  get lineTotal(): Money {
    return this.price.multiply(this._quantity);
  }
}
