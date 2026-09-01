import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { isUUID, generateUUID } from '@shared/domain/utils';

import { EventCancelledEvent } from '../events/event-cancelled.event';
import { EventCommissionOverrideUpdatedEvent } from '../events/event-commission-override-updated.event';
import { EventCreatedEvent } from '../events/event-created.event';
import { EventPublishedEvent } from '../events/event-published.event';
import { EventUpdatedEvent } from '../events/event-updated.event';
import { TicketTypeAddedEvent } from '../events/ticket-type-added.event';
import { TicketTypeUpdatedEvent } from '../events/ticket-type-updated.event';
import { DuplicateTicketTypeNameException } from '../exceptions/duplicate-ticket-type-name.exception';
import { EventCannotBeModifiedException } from '../exceptions/event-cannot-be-modified.exception';
import { EventNotCancellableException } from '../exceptions/event-not-cancellable.exception';
import { EventNotPublishableException } from '../exceptions/event-not-publishable.exception';
import { InvalidEventException } from '../exceptions/invalid-event.exception';
import { InvalidSalesPeriodException } from '../exceptions/invalid-sales-period.exception';
import { MaxTicketTypesReachedException } from '../exceptions/max-ticket-types-reached.exception';
import { Currency } from '../value-objects/currency.vo';
import { EventCategory, EventCategoryVO } from '../value-objects/event-category.vo';
import { EventDateRangeVO } from '../value-objects/event-date-range.vo';
import { EventStatus } from '../value-objects/event-status.vo';
import { LocationVO } from '../value-objects/location.vo';
import { TicketPriceVO } from '../value-objects/ticket-price.vo';

import { TicketTypeEntity } from './ticket-type.entity';

// ============================================
// Internal Interfaces (Not Exported)
// ============================================

/**
 * Props for creating a new Event
 * @internal
 */
interface CreateEventProps {
  id?: string;
  organizerId: string;
  title: string;
  description?: string | null;
  category: EventCategory;
  location: LocationVO;
  dateRange: EventDateRangeVO;
  imageUrl?: string | null;
}

/**
 * Props for reconstituting an Event from persistence
 * @internal
 */
interface EventProps {
  id: string;
  organizerId: string;
  commissionRateOverride?: number | null;
  title: string;
  description: string | null;
  category: EventCategory;
  location: LocationVO;
  dateRange: EventDateRangeVO;
  imageUrl: string | null;
  status: EventStatus;
  ticketTypes: TicketTypeEntity[];
  totalCapacity: number;
  soldTickets: number;
  revenueAmount: number;
  revenueCurrency: Currency;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
}

/**
 * Props for updating event details
 * @internal
 */
interface UpdateEventDetailsProps {
  title?: string;
  description?: string | null;
  category?: EventCategory;
  location?: LocationVO;
  dateRange?: EventDateRangeVO;
}

/**
 * Props for updating a ticket type
 * @internal
 */
interface UpdateTicketTypeProps {
  name?: string;
  description?: string | null;
  price?: TicketPriceVO;
  quantity?: number;
}

/**
 * Event Aggregate Root
 *
 * The main aggregate for the Events bounded context.
 * Manages event lifecycle, ticket types, and business rules.
 *
 * Lifecycle States:
 * - DRAFT: Event is being created/edited
 * - PUBLISHED: Event is live and visible to the public
 * - CANCELLED: Event has been cancelled
 * - COMPLETED: Event has finished (past end date)
 *
 * Business Rules:
 * - Only ORGANIZER role can create events (validated at application layer)
 * - Title required (1-200 chars)
 * - Start date must be in future for new events
 * - End date must be after start date
 * - At least one ticket type required for publishing
 * - Min 1, max 10 ticket types per event
 * - Total capacity = sum of all ticket type quantities
 * - Cannot reduce capacity below sold tickets
 * - Cannot cancel after event starts
 * - Cannot modify dates/location after publishing
 */
export class EventEntity extends BaseEntity<EventEntity> {
  // ============================================
  // Constants
  // ============================================

  private static readonly MAX_TITLE_LENGTH = 200;
  private static readonly MAX_DESCRIPTION_LENGTH = 5000;
  private static readonly MIN_TICKET_TYPES = 1;
  private static readonly MAX_TICKET_TYPES = 10;

  // ============================================
  // Private Properties
  // ============================================

  private _organizerId: string;
  private _commissionRateOverride: number | null;
  private _title: string;
  private _description: string | null;
  private _category: EventCategory;
  private _location: LocationVO;
  private _dateRange: EventDateRangeVO;
  private _imageUrl: string | null;
  private _status: EventStatus;
  private _ticketTypes: TicketTypeEntity[];
  private _totalCapacity: number;
  private _soldTickets: number;
  private _revenueAmount: number;
  private _revenueCurrency: Currency;
  private _publishedAt: Date | null;
  private _cancelledAt: Date | null;
  private _cancellationReason: string | null;

  // ============================================
  // Constructor
  // ============================================

  private constructor(props: EventProps) {
    super(props.id, props.createdAt);
    this._organizerId = props.organizerId;
    this._commissionRateOverride = props.commissionRateOverride ?? null;
    this._title = props.title;
    this._description = props.description;
    this._category = props.category;
    this._location = props.location;
    this._dateRange = props.dateRange;
    this._imageUrl = props.imageUrl;
    this._status = props.status;
    this._ticketTypes = props.ticketTypes;
    this._totalCapacity = props.totalCapacity;
    this._soldTickets = props.soldTickets;
    this._revenueAmount = props.revenueAmount;
    this._revenueCurrency = props.revenueCurrency;
    this._updatedAt = props.updatedAt;
    this._publishedAt = props.publishedAt;
    this._cancelledAt = props.cancelledAt;
    this._cancellationReason = props.cancellationReason;
  }

  // ============================================
  // Getters
  // ============================================

  get organizerId(): string {
    return this._organizerId;
  }

  get commissionRateOverride(): number | null {
    return this._commissionRateOverride;
  }

  setCommissionRateOverride(
    rate: number | null,
    adminId: string,
  ): Result<void, InvalidEventException> {
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 0.2)) {
      return Result.fail(InvalidEventException.invalidCommissionRate(rate));
    }

    if (rate === this._commissionRateOverride) {
      return Result.okVoid();
    }

    const previousRate = this._commissionRateOverride;
    this._commissionRateOverride = rate;
    this.touch();
    this.addDomainEvent(
      new EventCommissionOverrideUpdatedEvent(
        this._id,
        adminId,
        previousRate,
        rate,
        this._updatedAt,
      ),
    );
    return Result.okVoid();
  }

  get title(): string {
    return this._title;
  }

  get description(): string | null {
    return this._description;
  }

  get category(): EventCategory {
    return this._category;
  }

  get location(): LocationVO {
    return this._location;
  }

  get dateRange(): EventDateRangeVO {
    return this._dateRange;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get status(): EventStatus {
    return this._status;
  }

  get ticketTypes(): readonly TicketTypeEntity[] {
    return [...this._ticketTypes];
  }

  get totalCapacity(): number {
    return this._totalCapacity;
  }

  get soldTickets(): number {
    return this._soldTickets;
  }

  get publishedAt(): Date | null {
    return this._publishedAt;
  }

  get cancelledAt(): Date | null {
    return this._cancelledAt;
  }

  get cancellationReason(): string | null {
    return this._cancellationReason;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get total revenue for the event
   */
  getTotalRevenue(): TicketPriceVO {
    if (this._revenueAmount <= 0) {
      // Return minimal value as TicketPriceVO requires amount > 0
      // Use getTotalRevenueAmount() for true zero value
      return TicketPriceVO.create(0.001, this._revenueCurrency);
    }
    return TicketPriceVO.create(this._revenueAmount, this._revenueCurrency);
  }

  /**
   * Get total revenue amount (allows true zero)
   */
  getTotalRevenueAmount(): number {
    return this._revenueAmount;
  }

  /**
   * Get revenue currency
   */
  getRevenueCurrency(): Currency {
    return this._revenueCurrency;
  }

  /**
   * Get available capacity
   */
  getAvailableCapacity(): number {
    return Math.max(0, this._totalCapacity - this._soldTickets);
  }

  /**
   * Check if event can be cancelled
   * 
   * Business Rule: Both DRAFT and PUBLISHED events can be cancelled if they haven't started.
   * - DRAFT: Organizer can abandon an incomplete event
   * - PUBLISHED: Organizer can cancel before the event starts (triggers refunds)
   * 
   * Cannot cancel: CANCELLED, COMPLETED, or events that have already started.
   */
  canBeCancelled(): boolean {
    return (
      (this._status === EventStatus.DRAFT || this._status === EventStatus.PUBLISHED) &&
      !this.hasStarted()
    );
  }

  /**
   * Check if event can be modified
   * Only DRAFT events can be fully modified
   */
  canBeModified(): boolean {
    return this._status === EventStatus.DRAFT;
  }

  /**
   * Check if event is published
   */
  isPublished(): boolean {
    return this._status === EventStatus.PUBLISHED;
  }

  /**
   * Check if event has started
   */
  hasStarted(): boolean {
    return this._dateRange.hasStarted();
  }

  /**
   * Check if event has ended
   */
  hasEnded(): boolean {
    return this._dateRange.isInPast();
  }

  /**
   * Check if event is ongoing
   */
  isOngoing(): boolean {
    return this._dateRange.isOngoing();
  }

  /**
   * Get active ticket types (active and on sale)
   */
  getActiveTicketTypes(): TicketTypeEntity[] {
    return this._ticketTypes.filter((tt) => tt.isActive && tt.isOnSale());
  }

  /**
   * Get sales progress as percentage (0-100)
   */
  getSalesProgress(): number {
    if (this._totalCapacity === 0) return 0;
    return Math.round((this._soldTickets / this._totalCapacity) * 100);
  }

  /**
   * Check if event is sold out
   */
  isSoldOut(): boolean {
    return this._totalCapacity > 0 && this._soldTickets >= this._totalCapacity;
  }

  /**
   * Check if event has ticket types
   */
  hasTicketTypes(): boolean {
    return this._ticketTypes.length > 0;
  }

  /**
   * Get ticket type count
   */
  getTicketTypeCount(): number {
    return this._ticketTypes.length;
  }

  /**
   * Find ticket type by ID
   */
  findTicketType(ticketTypeId: string): TicketTypeEntity | undefined {
    return this._ticketTypes.find((tt) => tt.id === ticketTypeId);
  }

  /**
   * Check if event is in future
   */
  isInFuture(): boolean {
    return this._dateRange.isInFuture();
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Add a new ticket type to the event
   */
  addTicketType(
    ticketType: TicketTypeEntity,
  ): Result<
    void,
    | MaxTicketTypesReachedException
    | DuplicateTicketTypeNameException
    | InvalidSalesPeriodException
    | EventCannotBeModifiedException
  > {
    // Validate status allows adding ticket types
    if (this._status !== EventStatus.DRAFT && this._status !== EventStatus.PUBLISHED) {
      return Result.fail(
        EventCannotBeModifiedException.invalidStatusTransition(this._status, 'add ticket type'),
      );
    }

    // Validate max ticket types limit
    if (this._ticketTypes.length >= EventEntity.MAX_TICKET_TYPES) {
      return Result.fail(MaxTicketTypesReachedException.withLimit(EventEntity.MAX_TICKET_TYPES));
    }

    // Validate unique ticket type name
    const existingName = this._ticketTypes.find(
      (tt) => tt.name.toLowerCase() === ticketType.name.toLowerCase(),
    );
    if (existingName) {
      return Result.fail(DuplicateTicketTypeNameException.withName(ticketType.name));
    }

    // Validate sales end date is before event start date
    if (!ticketType.salesPeriod.validateForEvent(this._dateRange.startDate)) {
      return Result.fail(InvalidSalesPeriodException.salesEndAfterEventStart());
    }

    // Add ticket type
    this._ticketTypes.push(ticketType);

    // Recalculate total capacity
    this.recalculateTotalCapacity();

    // Update timestamp
    this.touch();

    // Publish domain event
    this.addDomainEvent(
      new TicketTypeAddedEvent(
        this._id,
        ticketType.id,
        ticketType.name,
        ticketType.price.toObject(),
        ticketType.quantity,
        ticketType.salesPeriod.startDate,
        ticketType.salesPeriod.endDate,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Update an existing ticket type
   */
  updateTicketType(
    ticketTypeId: string,
    updates: UpdateTicketTypeProps,
  ): Result<void, InvalidEventException | EventCannotBeModifiedException> {
    // Find ticket type
    const ticketType = this.findTicketType(ticketTypeId);
    if (!ticketType) {
      return Result.fail(InvalidEventException.ticketTypeNotFound(ticketTypeId));
    }

    // Track changes for event
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // Update name if provided
    if (updates.name !== undefined && updates.name !== ticketType.name) {
      // Validate unique name
      const existingName = this._ticketTypes.find(
        (tt) => tt.id !== ticketTypeId && tt.name.toLowerCase() === updates.name!.toLowerCase(),
      );
      if (existingName) {
        return Result.fail(
          new InvalidEventException(`Ticket type name "${updates.name}" already exists`),
        );
      }

      const oldName = ticketType.name;
      const result = ticketType.updateName(updates.name);
      if (result.isFailure) {
        return Result.fail(new InvalidEventException(result.error.message));
      }
      changes['name'] = { old: oldName, new: updates.name };
    }

    // Update description if provided
    if (updates.description !== undefined) {
      const oldDescription = ticketType.description;
      const result = ticketType.updateDescription(updates.description);
      if (result.isFailure) {
        return Result.fail(new InvalidEventException(result.error.message));
      }
      changes['description'] = { old: oldDescription, new: updates.description };
    }

    // Update price if provided
    if (updates.price !== undefined) {
      const oldPrice = ticketType.price.toObject();
      const result = ticketType.updatePrice(updates.price);
      if (result.isFailure) {
        return Result.fail(new InvalidEventException(result.error.message));
      }
      changes['price'] = { old: oldPrice, new: updates.price.toObject() };
    }

    // Update quantity if provided
    if (updates.quantity !== undefined) {
      const oldQuantity = ticketType.quantity;
      const result = ticketType.updateQuantity(updates.quantity);
      if (result.isFailure) {
        return Result.fail(new InvalidEventException(result.error.message));
      }
      changes['quantity'] = { old: oldQuantity, new: updates.quantity };

      // Recalculate total capacity
      this.recalculateTotalCapacity();
    }

    // Update timestamp
    this.touch();

    // Publish domain event if any changes were made
    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new TicketTypeUpdatedEvent(
          this._id,
          ticketTypeId,
          ticketType.name,
          changes,
          this._updatedAt,
        ),
      );
    }

    return Result.okVoid();
  }

  /**
   * Remove a ticket type (only for unpublished events with no sales)
   */
  removeTicketType(
    ticketTypeId: string,
  ): Result<void, InvalidEventException | EventCannotBeModifiedException> {
    // Validate status is DRAFT
    if (this._status !== EventStatus.DRAFT) {
      return Result.fail(EventCannotBeModifiedException.alreadyPublished());
    }

    // Find ticket type
    const ticketTypeIndex = this._ticketTypes.findIndex((tt) => tt.id === ticketTypeId);
    if (ticketTypeIndex === -1) {
      return Result.fail(InvalidEventException.ticketTypeNotFound(ticketTypeId));
    }

    const ticketType = this._ticketTypes[ticketTypeIndex];

    // Validate no sales
    if (ticketType.soldQuantity > 0) {
      return Result.fail(EventCannotBeModifiedException.ticketTypeHasSales(ticketType.name));
    }

    // Remove ticket type
    this._ticketTypes.splice(ticketTypeIndex, 1);

    // Recalculate total capacity
    this.recalculateTotalCapacity();

    // Update timestamp
    this.touch();

    return Result.okVoid();
  }

  /**
   * Publish the event (DRAFT -> PUBLISHED)
   */
  publish(): Result<void, EventNotPublishableException> {
    // Validate status is DRAFT
    if (this._status !== EventStatus.DRAFT) {
      return Result.fail(EventNotPublishableException.wrongStatus(this._status));
    }

    // Validate title exists
    if (!this._title || this._title.trim().length === 0) {
      return Result.fail(EventNotPublishableException.missingTitle());
    }

    // Validate location exists
    if (!this._location) {
      return Result.fail(EventNotPublishableException.missingLocation());
    }

    // Validate date range is valid and in future
    if (!this._dateRange.isInFuture()) {
      return Result.fail(EventNotPublishableException.eventDateInPast());
    }

    // Validate at least one active ticket type
    const activeTicketTypes = this._ticketTypes.filter((tt) => tt.isActive);
    if (activeTicketTypes.length === 0) {
      return Result.fail(EventNotPublishableException.missingTicketTypes());
    }

    // Set status to PUBLISHED
    this._status = EventStatus.PUBLISHED;
    this._publishedAt = new Date();

    // Update timestamp
    this.touch();

    // Publish domain event
    this.addDomainEvent(
      new EventPublishedEvent(
        this._id,
        this._organizerId,
        this._title,
        this._publishedAt,
        this._ticketTypes.length,
        this._totalCapacity,
      ),
    );

    return Result.okVoid();
  }

  /**
   * Cancel the event
   */
  cancel(reason: string): Result<void, EventNotCancellableException> {
    // Validate can be cancelled
    if (!this.canBeCancelled()) {
      if (this._status === EventStatus.CANCELLED) {
        return Result.fail(EventNotCancellableException.eventAlreadyCancelled());
      }
      if (this._status === EventStatus.COMPLETED) {
        return Result.fail(EventNotCancellableException.eventAlreadyCompleted());
      }
      if (this.hasStarted()) {
        return Result.fail(EventNotCancellableException.eventAlreadyStarted());
      }
      return Result.fail(EventNotCancellableException.wrongStatus(this._status));
    }

    // Set status to CANCELLED
    this._status = EventStatus.CANCELLED;
    this._cancelledAt = new Date();
    this._cancellationReason = reason?.trim() || 'No reason provided';

    // Update timestamp
    this.touch();

    // Publish domain event
    this.addDomainEvent(
      new EventCancelledEvent(
        this._id,
        this._organizerId,
        this._title,
        this._cancellationReason,
        this._cancelledAt,
        this._soldTickets,
        { amount: this._revenueAmount, currency: this._revenueCurrency },
      ),
    );

    return Result.okVoid();
  }

  /**
   * Mark event as completed (called by scheduler after event ends)
   */
  markAsCompleted(): void {
    // Only mark published events that have ended as completed
    if (this._status !== EventStatus.PUBLISHED) {
      return;
    }

    if (!this.hasEnded()) {
      return;
    }

    this._status = EventStatus.COMPLETED;
    this.touch();
  }

  /**
   * Update event details
   * 
   * Business Rules:
   * - DRAFT: All fields can be updated
   * - PUBLISHED: Only title, description, category can be updated (not location/dates)
   * - CANCELLED/COMPLETED: No updates allowed (terminal states)
   */
  updateDetails(
    updates: UpdateEventDetailsProps,
  ): Result<void, InvalidEventException | EventCannotBeModifiedException> {
    // Validate status allows modifications
    if (this._status === EventStatus.CANCELLED) {
      return Result.fail(EventCannotBeModifiedException.cancelled());
    }
    if (this._status === EventStatus.COMPLETED) {
      return Result.fail(EventCannotBeModifiedException.completed());
    }

    const changes: Record<string, unknown> = {};

    // Check if dates/location modifications are allowed
    const isPublished = this._status === EventStatus.PUBLISHED;

    // Update title
    if (updates.title !== undefined) {
      const validationResult = this.validateTitle(updates.title);
      if (validationResult.isFailure) {
        return validationResult;
      }
      changes['title'] = { old: this._title, new: updates.title };
      this._title = updates.title.trim();
    }

    // Update description
    if (updates.description !== undefined) {
      const validationResult = this.validateDescription(updates.description);
      if (validationResult.isFailure) {
        return validationResult;
      }
      changes['description'] = { old: this._description, new: updates.description };
      this._description = updates.description?.trim() || null;
    }

    // Update category
    if (updates.category !== undefined) {
      if (!EventCategoryVO.isValidCategory(updates.category)) {
        return Result.fail(InvalidEventException.invalidCategory(updates.category));
      }
      changes['category'] = { old: this._category, new: updates.category };
      this._category = updates.category;
    }

    // Update location (only if not published)
    if (updates.location !== undefined) {
      if (isPublished) {
        return Result.fail(EventCannotBeModifiedException.cannotModifyLocationAfterPublishing());
      }
      changes['location'] = {
        old: this._location.shortLocation,
        new: updates.location.shortLocation,
      };
      this._location = updates.location;
    }

    // Update date range (only if not published)
    if (updates.dateRange !== undefined) {
      if (isPublished) {
        return Result.fail(EventCannotBeModifiedException.cannotModifyDatesAfterPublishing());
      }
      changes['dateRange'] = {
        old: {
          startDate: this._dateRange.startDate.toISOString(),
          endDate: this._dateRange.endDate.toISOString(),
        },
        new: {
          startDate: updates.dateRange.startDate.toISOString(),
          endDate: updates.dateRange.endDate.toISOString(),
        },
      };
      this._dateRange = updates.dateRange;
    }

    // Update timestamp
    this.touch();

    // Publish domain event if any changes were made
    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new EventUpdatedEvent(this._id, this._organizerId, changes, this._updatedAt),
      );
    }

    return Result.okVoid();
  }

  /**
   * Update event image URL
   */
  updateImage(imageUrl: string | null): void {
    this._imageUrl = imageUrl;
    this.touch();
  }

  /**
   * Increment sold tickets and update revenue
   */
  incrementSoldTickets(
    ticketTypeId: string,
    quantity: number,
  ): Result<void, InvalidEventException> {
    // Find ticket type
    const ticketType = this.findTicketType(ticketTypeId);
    if (!ticketType) {
      return Result.fail(InvalidEventException.ticketTypeNotFound(ticketTypeId));
    }

    // Increment sold quantity on ticket type
    const result = ticketType.incrementSold(quantity);
    if (result.isFailure) {
      return Result.fail(new InvalidEventException(result.error.message));
    }

    // Increment event sold tickets
    this._soldTickets += quantity;

    // Update revenue (price * quantity)
    const ticketRevenue = ticketType.price.amount * quantity;
    this._revenueAmount += ticketRevenue;

    // Ensure currency consistency
    if (this._revenueCurrency !== ticketType.price.currency) {
      // In a real app, you'd handle currency conversion here
      // For now, we keep the first ticket type's currency
    }

    // Update timestamp
    this.touch();

    return Result.okVoid();
  }

  /**
   * Decrement sold tickets (for refunds)
   */
  decrementSoldTickets(
    ticketTypeId: string,
    quantity: number,
  ): Result<void, InvalidEventException> {
    // Find ticket type
    const ticketType = this.findTicketType(ticketTypeId);
    if (!ticketType) {
      return Result.fail(InvalidEventException.ticketTypeNotFound(ticketTypeId));
    }

    // Decrement sold quantity on ticket type
    const result = ticketType.decrementSold(quantity);
    if (result.isFailure) {
      return Result.fail(new InvalidEventException(result.error.message));
    }

    // Decrement event sold tickets
    this._soldTickets = Math.max(0, this._soldTickets - quantity);

    // Update revenue
    const ticketRevenue = ticketType.price.amount * quantity;
    this._revenueAmount = Math.max(0, this._revenueAmount - ticketRevenue);

    // Update timestamp
    this.touch();

    return Result.okVoid();
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Recalculate total capacity from ticket types
   */
  private recalculateTotalCapacity(): void {
    this._totalCapacity = this._ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0);
  }

  /**
   * Validate title
   */
  private validateTitle(title: string): Result<void, InvalidEventException> {
    const trimmed = title?.trim();
    if (!trimmed) {
      return Result.fail(InvalidEventException.missingTitle());
    }
    if (trimmed.length > EventEntity.MAX_TITLE_LENGTH) {
      return Result.fail(InvalidEventException.titleTooLong(EventEntity.MAX_TITLE_LENGTH));
    }
    return Result.okVoid();
  }

  /**
   * Validate description
   */
  private validateDescription(description: string | null): Result<void, InvalidEventException> {
    if (description && description.length > EventEntity.MAX_DESCRIPTION_LENGTH) {
      return Result.fail(
        InvalidEventException.descriptionTooLong(EventEntity.MAX_DESCRIPTION_LENGTH),
      );
    }
    return Result.okVoid();
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create a new Event
   */
  static create(
    props: CreateEventProps,
  ): Result<EventEntity, InvalidEventException> {
    // Validate organizerId exists
    if (!props.organizerId || props.organizerId.trim().length === 0) {
      return Result.fail(InvalidEventException.missingOrganizer());
    }

    // Validate organizerId is a valid UUID
    if (!isUUID(props.organizerId.trim())) {
      return Result.fail(InvalidEventException.invalidOrganizerId(props.organizerId));
    }

    // Validate title
    const trimmedTitle = props.title?.trim();
    if (!trimmedTitle) {
      return Result.fail(InvalidEventException.missingTitle());
    }
    if (trimmedTitle.length > EventEntity.MAX_TITLE_LENGTH) {
      return Result.fail(InvalidEventException.titleTooLong(EventEntity.MAX_TITLE_LENGTH));
    }

    // Validate description
    if (props.description && props.description.length > EventEntity.MAX_DESCRIPTION_LENGTH) {
      return Result.fail(
        InvalidEventException.descriptionTooLong(EventEntity.MAX_DESCRIPTION_LENGTH),
      );
    }

    // Validate category
    if (!EventCategoryVO.isValidCategory(props.category)) {
      return Result.fail(InvalidEventException.invalidCategory(props.category));
    }

    // Generate ID if not provided
    const id = props.id || EventEntity.generateId();

    const event = new EventEntity({
      id,
      organizerId: props.organizerId.trim(),
      commissionRateOverride: null,
      title: trimmedTitle,
      description: props.description?.trim() || null,
      category: props.category,
      location: props.location,
      dateRange: props.dateRange,
      imageUrl: props.imageUrl || null,
      status: EventStatus.DRAFT,
      ticketTypes: [],
      totalCapacity: 0,
      soldTickets: 0,
      revenueAmount: 0,
      revenueCurrency: Currency.TND, // Default currency
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
      cancelledAt: null,
      cancellationReason: null,
    });

    // Publish domain event
    event.addDomainEvent(
      new EventCreatedEvent(event._id, event._organizerId, event._title, event._category),
    );

    return Result.ok(event);
  }

  /**
   * Reconstitute an Event from persistence
   * No validation - assumes data is valid from DB
   */
  static reconstitute(props: EventProps): EventEntity {
    return new EventEntity(props);
  }

  /**
   * Generate a unique ID for a new event
   */
  private static generateId(): string {
    return generateUUID();
  }

  // ============================================
  // BaseEntity Implementation
  // ============================================

  /**
   * Clone this event (without domain events)
   */
  clone(): EventEntity {
    return new EventEntity({
      id: this._id,
      organizerId: this._organizerId,
      commissionRateOverride: this._commissionRateOverride,
      title: this._title,
      description: this._description,
      category: this._category,
      location: this._location,
      dateRange: this._dateRange,
      imageUrl: this._imageUrl,
      status: this._status,
      ticketTypes: this._ticketTypes.map((tt) => tt.clone()),
      totalCapacity: this._totalCapacity,
      soldTickets: this._soldTickets,
      revenueAmount: this._revenueAmount,
      revenueCurrency: this._revenueCurrency,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      publishedAt: this._publishedAt,
      cancelledAt: this._cancelledAt,
      cancellationReason: this._cancellationReason,
    });
  }

  /**
   * Validate this event
   */
  validate(): void {
    if (!this._organizerId || this._organizerId.trim().length === 0) {
      throw InvalidEventException.missingOrganizer();
    }
    if (!this._title || this._title.trim().length === 0) {
      throw InvalidEventException.missingTitle();
    }
    if (this._title.length > EventEntity.MAX_TITLE_LENGTH) {
      throw InvalidEventException.titleTooLong(EventEntity.MAX_TITLE_LENGTH);
    }
    if (this._description && this._description.length > EventEntity.MAX_DESCRIPTION_LENGTH) {
      throw InvalidEventException.descriptionTooLong(EventEntity.MAX_DESCRIPTION_LENGTH);
    }
    if (!EventCategoryVO.isValidCategory(this._category)) {
      throw InvalidEventException.invalidCategory(this._category);
    }
  }

  /**
   * Convert to plain object for serialization
   */
  toObject(): {
    id: string;
    organizerId: string;
    commissionRateOverride: number | null;
    title: string;
    description: string | null;
    category: string;
    location: {
      address: string | null;
      city: string;
      country: string;
      coordinates: { latitude: number; longitude: number } | null;
    };
    dateRange: {
      startDate: string;
      endDate: string;
    };
    imageUrl: string | null;
    status: string;
    ticketTypes: ReturnType<TicketTypeEntity['toObject']>[];
    totalCapacity: number;
    soldTickets: number;
    availableCapacity: number;
    revenue: { amount: number; currency: string };
    salesProgress: number;
    isSoldOut: boolean;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
  } {
    return {
      id: this._id,
      organizerId: this._organizerId,
      commissionRateOverride: this._commissionRateOverride,
      title: this._title,
      description: this._description,
      category: this._category,
      location: {
        address: this._location.address,
        city: this._location.city,
        country: this._location.country,
        coordinates: this._location.coordinates,
      },
      dateRange: {
        startDate: this._dateRange.startDate.toISOString(),
        endDate: this._dateRange.endDate.toISOString(),
      },
      imageUrl: this._imageUrl,
      status: this._status,
      ticketTypes: this._ticketTypes.map((tt) => tt.toObject()),
      totalCapacity: this._totalCapacity,
      soldTickets: this._soldTickets,
      availableCapacity: this.getAvailableCapacity(),
      revenue: {
        amount: this._revenueAmount,
        currency: this._revenueCurrency,
      },
      salesProgress: this.getSalesProgress(),
      isSoldOut: this.isSoldOut(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      publishedAt: this._publishedAt?.toISOString() || null,
      cancelledAt: this._cancelledAt?.toISOString() || null,
      cancellationReason: this._cancellationReason,
    };
  }
}
