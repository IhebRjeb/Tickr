import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { TicketPriceVO } from '../value-objects/ticket-price.vo';
import { SalesPeriodVO } from '../value-objects/sales-period.vo';
import { Currency } from '../value-objects/currency.vo';
import { InvalidTicketTypeException } from '../exceptions/invalid-ticket-type.exception';
import { TicketTypeSoldOutEvent } from '../events/ticket-type-sold-out.event';

/**
 * Props for creating a TicketType
 * @internal - Not exported to avoid architecture naming convention conflicts
 */
interface CreateTicketTypeProps {
  id?: string;
  eventId: string;
  name: string;
  description?: string | null;
  price: TicketPriceVO;
  quantity: number;
  salesPeriod: SalesPeriodVO;
  isActive?: boolean;
  soldQuantity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Props for reconstituting a TicketType from persistence
 * @internal - Not exported to avoid architecture naming convention conflicts
 */
interface TicketTypeProps {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: TicketPriceVO;
  quantity: number;
  soldQuantity: number;
  salesPeriod: SalesPeriodVO;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TicketType Entity (Sub-entity of Event Aggregate)
 *
 * Represents a type of ticket for an event with its price, quantity, and sales period.
 * Part of the Event aggregate - should be managed through the Event entity.
 *
 * Business Rules:
 * - Name is required (max 100 chars)
 * - Description is optional (max 500 chars)
 * - Price must be > 0
 * - Quantity must be > 0
 * - Sales start must be before sales end
 * - Cannot modify price after first sale
 * - Cannot reduce quantity below sold quantity
 * - Sold quantity cannot exceed total quantity
 */
export class TicketTypeEntity extends BaseEntity<TicketTypeEntity> {
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_DESCRIPTION_LENGTH = 500;

  private _eventId: string;
  private _name: string;
  private _description: string | null;
  private _price: TicketPriceVO;
  private _quantity: number;
  private _soldQuantity: number;
  private _salesPeriod: SalesPeriodVO;
  private _isActive: boolean;

  private constructor(props: TicketTypeProps) {
    super(props.id, props.createdAt);
    this._eventId = props.eventId;
    this._name = props.name;
    this._description = props.description;
    this._price = props.price;
    this._quantity = props.quantity;
    this._soldQuantity = props.soldQuantity;
    this._salesPeriod = props.salesPeriod;
    this._isActive = props.isActive;
    this._updatedAt = props.updatedAt;
  }

  // ============================================
  // Getters
  // ============================================

  get eventId(): string {
    return this._eventId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get price(): TicketPriceVO {
    return this._price;
  }

  get quantity(): number {
    return this._quantity;
  }

  get soldQuantity(): number {
    return this._soldQuantity;
  }

  get salesPeriod(): SalesPeriodVO {
    return this._salesPeriod;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Check if this ticket type is sold out
   */
  isSoldOut(): boolean {
    return this._soldQuantity >= this._quantity;
  }

  /**
   * Check if this ticket type is currently on sale
   * Must be active, within sales period, and not sold out
   */
  isOnSale(): boolean {
    return this._isActive && this._salesPeriod.isOnSale() && !this.isSoldOut();
  }

  /**
   * Get the number of available tickets
   */
  getAvailableQuantity(): number {
    return Math.max(0, this._quantity - this._soldQuantity);
  }

  /**
   * Get sales progress as a percentage (0-100)
   */
  getSalesProgress(): number {
    if (this._quantity === 0) return 0;
    return Math.round((this._soldQuantity / this._quantity) * 100);
  }

  /**
   * Check if sales have started (at least one ticket sold)
   */
  hasSalesStarted(): boolean {
    return this._soldQuantity > 0;
  }

  /**
   * Get the total revenue for this ticket type
   * Returns the price multiplied by sold quantity, or a minimal price (0.001) if no sales
   */
  getTotalRevenue(): TicketPriceVO {
    if (this._soldQuantity === 0) {
      // Return minimal value as TicketPriceVO requires amount > 0
      // Caller should check hasSalesStarted() or soldQuantity for true zero
      return TicketPriceVO.create(0.001, this._price.currency);
    }
    return this._price.multiply(this._soldQuantity);
  }

  /**
   * Get the total revenue amount (allows true zero)
   */
  getTotalRevenueAmount(): number {
    return this._price.amount * this._soldQuantity;
  }

  /**
   * Check if sales period is pending (not started yet)
   */
  isSalesPending(): boolean {
    return this._salesPeriod.isPending();
  }

  /**
   * Check if sales period has ended
   */
  hasSalesEnded(): boolean {
    return this._salesPeriod.hasEnded();
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Update the ticket price
   * Cannot update if tickets have already been sold
   */
  updatePrice(newPrice: TicketPriceVO): Result<void, InvalidTicketTypeException> {
    // Cannot modify price after sales have started
    if (this._soldQuantity > 0) {
      return Result.fail(InvalidTicketTypeException.cannotModifyAfterSales());
    }

    this._price = newPrice;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Update the ticket quantity
   * Cannot reduce below sold quantity
   */
  updateQuantity(newQuantity: number): Result<void, InvalidTicketTypeException> {
    // Validate quantity is positive
    if (newQuantity <= 0) {
      return Result.fail(InvalidTicketTypeException.invalidQuantity());
    }

    // Cannot reduce quantity below sold quantity
    if (newQuantity < this._soldQuantity) {
      return Result.fail(InvalidTicketTypeException.cannotReduceQuantity(this._soldQuantity));
    }

    this._quantity = newQuantity;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Update the ticket name
   */
  updateName(newName: string): Result<void, InvalidTicketTypeException> {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      return Result.fail(InvalidTicketTypeException.missingName());
    }

    if (trimmedName.length > TicketTypeEntity.MAX_NAME_LENGTH) {
      return Result.fail(InvalidTicketTypeException.nameTooLong(TicketTypeEntity.MAX_NAME_LENGTH));
    }

    this._name = trimmedName;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Update the ticket description
   */
  updateDescription(newDescription: string | null): Result<void, InvalidTicketTypeException> {
    if (newDescription !== null && newDescription.length > TicketTypeEntity.MAX_DESCRIPTION_LENGTH) {
      return Result.fail(
        new InvalidTicketTypeException(
          `Description must be at most ${TicketTypeEntity.MAX_DESCRIPTION_LENGTH} characters`,
        ),
      );
    }

    this._description = newDescription?.trim() || null;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Update the sales period
   * Cannot update if tickets have already been sold
   */
  updateSalesPeriod(newSalesPeriod: SalesPeriodVO): Result<void, InvalidTicketTypeException> {
    // Cannot modify sales period after sales have started
    if (this._soldQuantity > 0) {
      return Result.fail(InvalidTicketTypeException.cannotModifyAfterSales());
    }

    this._salesPeriod = newSalesPeriod;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Increment the sold quantity
   * Validates that sufficient quantity is available
   * Publishes TicketTypeSoldOutEvent if sold out after increment
   */
  incrementSold(quantity: number): Result<void, InvalidTicketTypeException> {
    if (quantity <= 0) {
      return Result.fail(new InvalidTicketTypeException('Quantity to increment must be positive'));
    }

    const newSoldQuantity = this._soldQuantity + quantity;

    if (newSoldQuantity > this._quantity) {
      return Result.fail(
        new InvalidTicketTypeException(
          `Insufficient tickets available. Requested: ${quantity}, Available: ${this.getAvailableQuantity()}`,
        ),
      );
    }

    this._soldQuantity = newSoldQuantity;
    this.touch();

    // Publish sold out event if now sold out
    if (this.isSoldOut()) {
      this.addDomainEvent(
        new TicketTypeSoldOutEvent(this._id, this._eventId, this._name, this._quantity),
      );
    }

    return Result.okVoid();
  }

  /**
   * Decrement the sold quantity (for refunds/cancellations)
   */
  decrementSold(quantity: number): Result<void, InvalidTicketTypeException> {
    if (quantity <= 0) {
      return Result.fail(new InvalidTicketTypeException('Quantity to decrement must be positive'));
    }

    if (quantity > this._soldQuantity) {
      return Result.fail(
        new InvalidTicketTypeException(
          `Cannot decrement ${quantity} tickets. Only ${this._soldQuantity} sold.`,
        ),
      );
    }

    this._soldQuantity -= quantity;
    this.touch();
    return Result.okVoid();
  }

  /**
   * Deactivate this ticket type
   */
  deactivate(): void {
    this._isActive = false;
    this.touch();
  }

  /**
   * Reactivate this ticket type
   * Cannot reactivate if sold out
   */
  reactivate(): Result<void, InvalidTicketTypeException> {
    if (this.isSoldOut()) {
      return Result.fail(
        new InvalidTicketTypeException('Cannot reactivate a sold out ticket type'),
      );
    }

    this._isActive = true;
    this.touch();
    return Result.okVoid();
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create a new TicketType
   */
  static create(props: CreateTicketTypeProps): Result<TicketTypeEntity, InvalidTicketTypeException> {
    // Validate name
    const trimmedName = props.name?.trim();
    if (!trimmedName) {
      return Result.fail(InvalidTicketTypeException.missingName());
    }
    if (trimmedName.length > TicketTypeEntity.MAX_NAME_LENGTH) {
      return Result.fail(InvalidTicketTypeException.nameTooLong(TicketTypeEntity.MAX_NAME_LENGTH));
    }

    // Validate description
    if (
      props.description !== null &&
      props.description !== undefined &&
      props.description.length > TicketTypeEntity.MAX_DESCRIPTION_LENGTH
    ) {
      return Result.fail(
        new InvalidTicketTypeException(
          `Description must be at most ${TicketTypeEntity.MAX_DESCRIPTION_LENGTH} characters`,
        ),
      );
    }

    // Validate quantity
    if (props.quantity <= 0) {
      return Result.fail(InvalidTicketTypeException.invalidQuantity());
    }

    // Validate soldQuantity if provided
    const soldQuantity = props.soldQuantity ?? 0;
    if (soldQuantity < 0) {
      return Result.fail(new InvalidTicketTypeException('Sold quantity cannot be negative'));
    }
    if (soldQuantity > props.quantity) {
      return Result.fail(InvalidTicketTypeException.soldExceedsQuantity());
    }

    // Generate ID if not provided
    const id = props.id || TicketTypeEntity.generateId();

    const ticketType = new TicketTypeEntity({
      id,
      eventId: props.eventId,
      name: trimmedName,
      description: props.description?.trim() || null,
      price: props.price,
      quantity: props.quantity,
      soldQuantity,
      salesPeriod: props.salesPeriod,
      isActive: props.isActive ?? true,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    });

    return Result.ok(ticketType);
  }

  /**
   * Reconstitute a TicketType from persistence
   * No validation - assumes data is valid from DB
   */
  static reconstitute(props: TicketTypeProps): TicketTypeEntity {
    return new TicketTypeEntity(props);
  }

  /**
   * Generate a unique ID for a new ticket type
   */
  private static generateId(): string {
    return `tt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // BaseEntity Implementation
  // ============================================

  /**
   * Clone this ticket type
   */
  clone(): TicketTypeEntity {
    return new TicketTypeEntity({
      id: this._id,
      eventId: this._eventId,
      name: this._name,
      description: this._description,
      price: this._price,
      quantity: this._quantity,
      soldQuantity: this._soldQuantity,
      salesPeriod: this._salesPeriod,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    });
  }

  /**
   * Validate this ticket type
   */
  validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw InvalidTicketTypeException.missingName();
    }
    if (this._name.length > TicketTypeEntity.MAX_NAME_LENGTH) {
      throw InvalidTicketTypeException.nameTooLong(TicketTypeEntity.MAX_NAME_LENGTH);
    }
    if (this._quantity <= 0) {
      throw InvalidTicketTypeException.invalidQuantity();
    }
    if (this._soldQuantity > this._quantity) {
      throw InvalidTicketTypeException.soldExceedsQuantity();
    }
  }

  /**
   * Convert to plain object for serialization
   */
  toObject(): {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    price: { amount: number; currency: string };
    quantity: number;
    soldQuantity: number;
    availableQuantity: number;
    salesPeriod: { startDate: string; endDate: string };
    isActive: boolean;
    isSoldOut: boolean;
    isOnSale: boolean;
    salesProgress: number;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this._id,
      eventId: this._eventId,
      name: this._name,
      description: this._description,
      price: this._price.toObject(),
      quantity: this._quantity,
      soldQuantity: this._soldQuantity,
      availableQuantity: this.getAvailableQuantity(),
      salesPeriod: this._salesPeriod.toISOStrings(),
      isActive: this._isActive,
      isSoldOut: this.isSoldOut(),
      isOnSale: this.isOnSale(),
      salesProgress: this.getSalesProgress(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
