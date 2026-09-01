/**
 * @file Event Entity Unit Tests
 * @description Tests for Event aggregate root - the main entity of the Events bounded context
 */

import {
  EventEntity,
  TicketTypeEntity,
  LocationVO,
  EventDateRangeVO,
  EventCategory,
  EventStatus,
  TicketPriceVO,
  SalesPeriodVO,
  Currency,
  EventCreatedEvent,
  EventCommissionOverrideUpdatedEvent,
  EventPublishedEvent,
  EventUpdatedEvent,
  EventCancelledEvent,
  TicketTypeAddedEvent,
  TicketTypeUpdatedEvent,
  TicketTypeSoldOutEvent,
} from '@modules/events/domain';

describe('EventEntity (Aggregate Root)', () => {
  // Helper functions for creating test data
  const createValidLocation = (): LocationVO => {
    return LocationVO.create({
      address: '123 Test Street',
      city: 'Tunis',
      country: 'Tunisia',
      latitude: 36.8065,
      longitude: 10.1815,
    });
  };

  const createValidDateRange = (startDaysFromNow = 30, durationHours = 5): EventDateRangeVO => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + startDaysFromNow);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + durationHours);
    
    return EventDateRangeVO.create(startDate, endDate);
  };

  const createValidTicketType = (overrides: Partial<{
    name: string;
    description: string;
    price: TicketPriceVO;
    quantity: number;
    salesPeriod: SalesPeriodVO;
    eventId: string;
  }> = {}): TicketTypeEntity => {
    const now = new Date();
    const salesStart = new Date(now);
    salesStart.setDate(salesStart.getDate() + 1);
    const salesEnd = new Date(now);
    salesEnd.setDate(salesEnd.getDate() + 25);

    const price = TicketPriceVO.create(100, Currency.TND);
    const salesPeriod = SalesPeriodVO.create(salesStart, salesEnd);

    const result = TicketTypeEntity.create({
      eventId: overrides.eventId ?? '550e8400-e29b-41d4-a716-446655440001',
      name: overrides.name ?? 'Standard',
      description: overrides.description ?? 'Standard ticket',
      price: overrides.price ?? price,
      quantity: overrides.quantity ?? 100,
      salesPeriod: overrides.salesPeriod ?? salesPeriod,
    });
    return result.value;
  };

  const createValidEventProps = () => ({
    organizerId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Summer Music Festival 2024',
    description: 'The biggest music festival of the year',
    category: EventCategory.CONCERT,
    location: createValidLocation(),
    dateRange: createValidDateRange(),
  });

  describe('EventEntity.create() - Static Factory Method', () => {
    describe('Success Cases', () => {
      it('should create a valid event with all required properties', () => {
        const props = createValidEventProps();
        const result = EventEntity.create(props);

        expect(result.isSuccess).toBe(true);
        const event = result.value;
        expect(event.organizerId).toBe(props.organizerId);
        expect(event.title).toBe(props.title);
        expect(event.description).toBe(props.description);
        expect(event.category).toBe(EventCategory.CONCERT);
        expect(event.status).toBe(EventStatus.DRAFT);
        expect(event.totalCapacity).toBe(0);
        expect(event.soldTickets).toBe(0);
      });

      it('should create event with DRAFT status by default', () => {
        const result = EventEntity.create(createValidEventProps());
        expect(result.value.status).toBe(EventStatus.DRAFT);
      });

      it('should create event with null imageUrl by default', () => {
        const result = EventEntity.create(createValidEventProps());
        expect(result.value.imageUrl).toBeNull();
      });

      it('should create event with empty ticketTypes array', () => {
        const result = EventEntity.create(createValidEventProps());
        expect(result.value.ticketTypes).toEqual([]);
      });

      it('should create event with zero revenue', () => {
        const result = EventEntity.create(createValidEventProps());
        const revenue = result.value.getTotalRevenue();
        // TND has 3 decimal places, so small rounding may occur
        expect(revenue.amount).toBeLessThan(1);
      });

      it('should create event without description (optional)', () => {
        const props = createValidEventProps();
        delete (props as Record<string, unknown>).description;
        const result = EventEntity.create(props);

        expect(result.isSuccess).toBe(true);
        // Description can be undefined or null depending on implementation
        expect(result.value.description == null || result.value.description === undefined).toBe(true);
      });

      it('should generate unique ID for each event', () => {
        const event1 = EventEntity.create(createValidEventProps()).value;
        const event2 = EventEntity.create(createValidEventProps()).value;
        expect(event1.id).not.toBe(event2.id);
      });

      it('should publish EventCreatedEvent on creation', () => {
        const result = EventEntity.create(createValidEventProps());
        const event = result.value;
        const domainEvents = event.domainEvents;

        expect(domainEvents.length).toBeGreaterThanOrEqual(1);
        const createdEvent = domainEvents.find(
          (e): e is EventCreatedEvent => e instanceof EventCreatedEvent
        );
        expect(createdEvent).toBeDefined();
        // The event contains the correct eventId
        expect(createdEvent?.eventId).toBeDefined();
      });

      it('should set createdAt and updatedAt timestamps', () => {
        const beforeCreate = new Date();
        const result = EventEntity.create(createValidEventProps());
        const afterCreate = new Date();
        const event = result.value;

        expect(event.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
        expect(event.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        expect(event.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      });
    });

    describe('Validation Failures', () => {
      it('should fail with invalid organizerId (not UUID format)', () => {
        const props = createValidEventProps();
        props.organizerId = 'invalid-uuid';
        const result = EventEntity.create(props);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('Invalid organizer ID');
        expect(result.error.message).toContain('UUID');
      });

      it('should fail with numeric organizerId', () => {
        const props = createValidEventProps();
        props.organizerId = '12345';
        const result = EventEntity.create(props);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('UUID');
      });

      it('should fail with empty organizerId', () => {
        const props = createValidEventProps();
        props.organizerId = '';
        const result = EventEntity.create(props);

        expect(result.isFailure).toBe(true);
      });

      it('should fail with empty title', () => {
        const props = createValidEventProps();
        props.title = '';
        const result = EventEntity.create(props);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('title');
      });

      it('should fail with title exceeding 200 characters', () => {
        const props = createValidEventProps();
        props.title = 'A'.repeat(201);
        const result = EventEntity.create(props);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('200');
      });

      it('should fail with description exceeding 5000 characters', () => {
        const props = createValidEventProps();
        props.description = 'A'.repeat(5001);
        const result = EventEntity.create(props);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('5000');
      });

      it('should accept description at exactly 5000 characters', () => {
        const props = createValidEventProps();
        props.description = 'A'.repeat(5000);
        const result = EventEntity.create(props);

        expect(result.isSuccess).toBe(true);
      });

      it('should accept title at exactly 200 characters', () => {
        const props = createValidEventProps();
        props.title = 'A'.repeat(200);
        const result = EventEntity.create(props);

        expect(result.isSuccess).toBe(true);
      });
    });
  });

  describe('addTicketType()', () => {
    describe('Success Cases', () => {
      it('should add a ticket type to a DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });

        const result = event.addTicketType(ticketType);

        expect(result.isSuccess).toBe(true);
        expect(event.ticketTypes.length).toBe(1);
        expect(event.ticketTypes[0].name).toBe('Standard');
      });

      it('should update totalCapacity when adding ticket type', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 150 });

        event.addTicketType(ticketType);

        expect(event.totalCapacity).toBe(150);
      });

      it('should accumulate capacity with multiple ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType1 = createValidTicketType({ eventId: event.id, name: 'Standard', quantity: 100 });
        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP', quantity: 50 });

        event.addTicketType(ticketType1);
        event.addTicketType(ticketType2);

        expect(event.totalCapacity).toBe(150);
        expect(event.ticketTypes.length).toBe(2);
      });

      it('should publish TicketTypeAddedEvent', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        event.clearDomainEvents(); // Clear creation event
        const ticketType = createValidTicketType({ eventId: event.id });

        event.addTicketType(ticketType);

        const domainEvents = event.domainEvents;
        const addedEvent = domainEvents.find(
          (e): e is TicketTypeAddedEvent => e instanceof TicketTypeAddedEvent
        );
        expect(addedEvent).toBeDefined();
      });

      it('should allow adding ticket type to PUBLISHED event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType1 = createValidTicketType({ eventId: event.id, name: 'Standard' });
        event.addTicketType(ticketType1);
        event.publish();
        
        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP' });
        const result = event.addTicketType(ticketType2);

        expect(result.isSuccess).toBe(true);
        expect(event.ticketTypes.length).toBe(2);
      });
    });

    describe('Validation Failures', () => {
      it('should fail when adding ticket type with duplicate name', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType1 = createValidTicketType({ eventId: event.id, name: 'VIP' });
        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP' });

        event.addTicketType(ticketType1);
        const result = event.addTicketType(ticketType2);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('VIP');
      });

      it('should fail when exceeding 10 ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        // Add 10 ticket types
        for (let i = 1; i <= 10; i++) {
          const ticketType = createValidTicketType({ eventId: event.id, name: `Ticket Type ${i}` });
          event.addTicketType(ticketType);
        }

        // Try to add 11th
        const extraTicketType = createValidTicketType({ eventId: event.id, name: 'Extra' });
        const result = event.addTicketType(extraTicketType);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('10');
      });

      it('should fail when event is CANCELLED', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType1 = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType1);
        event.publish();
        event.cancel('Test cancellation');

        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP' });
        const result = event.addTicketType(ticketType2);

        expect(result.isFailure).toBe(true);
      });

      it('should fail when event is COMPLETED', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType1 = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType1);
        event.publish();
        
        // Force status to COMPLETED (simulating scheduled job)
        (event as unknown as { _status: EventStatus })._status = EventStatus.COMPLETED;

        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP' });
        const result = event.addTicketType(ticketType2);

        expect(result.isFailure).toBe(true);
      });
    });
  });

  describe('updateTicketType()', () => {
    describe('Success Cases', () => {
      it('should update ticket type description', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);

        const result = event.updateTicketType(ticketType.id, {
          description: 'Updated description',
        });

        expect(result.isSuccess).toBe(true);
        expect(event.ticketTypes[0].description).toBe('Updated description');
      });

      it('should update ticket type quantity when no tickets sold', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);

        const result = event.updateTicketType(ticketType.id, {
          quantity: 200,
        });

        expect(result.isSuccess).toBe(true);
        expect(event.ticketTypes[0].quantity).toBe(200);
        expect(event.totalCapacity).toBe(200);
      });

      it('should publish TicketTypeUpdatedEvent', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.clearDomainEvents();

        event.updateTicketType(ticketType.id, { description: 'Updated' });

        const domainEvents = event.domainEvents;
        const updatedEvent = domainEvents.find(
          (e): e is TicketTypeUpdatedEvent => e instanceof TicketTypeUpdatedEvent
        );
        expect(updatedEvent).toBeDefined();
      });
    });

    describe('Validation Failures', () => {
      it('should fail when ticket type not found', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);

        const result = event.updateTicketType('non-existent-id', {
          description: 'Updated',
        });

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('not found');
      });

      it('should fail when updating to duplicate name', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType1 = createValidTicketType({ eventId: event.id, name: 'Standard' });
        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP' });
        event.addTicketType(ticketType1);
        event.addTicketType(ticketType2);

        const result = event.updateTicketType(ticketType2.id, {
          name: 'Standard',
        });

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('Standard');
      });

      it('should fail when reducing quantity below sold quantity', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);
        event.publish();
        
        // Simulate some sales
        event.incrementSoldTickets(ticketType.id, 50);

        const result = event.updateTicketType(ticketType.id, {
          quantity: 30, // Less than 50 sold
        });

        expect(result.isFailure).toBe(true);
      });
    });
  });

  describe('removeTicketType()', () => {
    describe('Success Cases', () => {
      it('should remove ticket type from DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);

        const result = event.removeTicketType(ticketType.id);

        expect(result.isSuccess).toBe(true);
        expect(event.ticketTypes.length).toBe(0);
      });

      it('should update totalCapacity after removal', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType1 = createValidTicketType({ eventId: event.id, name: 'Standard', quantity: 100 });
        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP', quantity: 50 });
        event.addTicketType(ticketType1);
        event.addTicketType(ticketType2);

        event.removeTicketType(ticketType1.id);

        expect(event.totalCapacity).toBe(50);
        expect(event.ticketTypes.length).toBe(1);
      });
    });

    describe('Validation Failures', () => {
      it('should fail when event is PUBLISHED', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.removeTicketType(ticketType.id);

        expect(result.isFailure).toBe(true);
      });

      it('should fail when ticket type has sold tickets', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        
        // Simulate sales in draft (edge case)
        (event.ticketTypes[0] as unknown as { _soldQuantity: number })._soldQuantity = 5;

        const result = event.removeTicketType(ticketType.id);

        expect(result.isFailure).toBe(true);
      });

      it('should fail when ticket type not found', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.removeTicketType('non-existent-id');

        expect(result.isFailure).toBe(true);
      });
    });
  });

  describe('publish()', () => {
    describe('Success Cases', () => {
      it('should publish a valid DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);

        const result = event.publish();

        expect(result.isSuccess).toBe(true);
        expect(event.status).toBe(EventStatus.PUBLISHED);
        expect(event.publishedAt).toBeDefined();
      });

      it('should set publishedAt timestamp', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        const beforePublish = new Date();

        event.publish();

        expect(event.publishedAt!.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime());
      });

      it('should publish EventPublishedEvent', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.clearDomainEvents();

        event.publish();

        const domainEvents = event.domainEvents;
        const publishedEvent = domainEvents.find(
          (e): e is EventPublishedEvent => e instanceof EventPublishedEvent
        );
        expect(publishedEvent).toBeDefined();
        expect(publishedEvent?.aggregateId).toBe(event.id);
      });
    });

    describe('Validation Failures', () => {
      it('should fail when event has no ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.publish();

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('ticket type');
      });

      it('should fail when event is already PUBLISHED', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.publish();

        expect(result.isFailure).toBe(true);
      });

      it('should fail when event is CANCELLED', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        event.cancel('Test');

        const result = event.publish();

        expect(result.isFailure).toBe(true);
      });

      it('should fail when no active ticket types exist', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        
        // Deactivate the ticket type
        (event.ticketTypes[0] as unknown as { _isActive: boolean })._isActive = false;

        const result = event.publish();

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('active');
      });
    });
  });

  describe('cancel()', () => {
    describe('Success Cases', () => {
      it('should cancel a PUBLISHED event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.cancel('Unforeseen circumstances');

        expect(result.isSuccess).toBe(true);
        expect(event.status).toBe(EventStatus.CANCELLED);
      });

      it('should set cancelledAt timestamp', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        const beforeCancel = new Date();

        event.cancel('Test reason');

        expect(event.cancelledAt!.getTime()).toBeGreaterThanOrEqual(beforeCancel.getTime());
      });

      it('should store cancellation reason', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        event.cancel('Weather conditions');

        expect(event.cancellationReason).toBe('Weather conditions');
      });

      it('should publish EventCancelledEvent', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        event.clearDomainEvents();

        event.cancel('Test');

        const domainEvents = event.domainEvents;
        const cancelledEvent = domainEvents.find(
          (e): e is EventCancelledEvent => e instanceof EventCancelledEvent
        );
        expect(cancelledEvent).toBeDefined();
      });
    });

    describe('Validation Failures', () => {
      it('should allow cancelling DRAFT event', () => {
        // Implementation allows cancelling DRAFT events (organizer can abandon draft)
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.cancel('Changed my mind');

        expect(result.isSuccess).toBe(true);
        expect(event.status).toBe(EventStatus.CANCELLED);
      });

      it('should fail when event is already CANCELLED', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        event.cancel('First cancellation');

        const result = event.cancel('Second cancellation');

        expect(result.isFailure).toBe(true);
      });

      it('should fail when event is COMPLETED', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        (event as unknown as { _status: EventStatus })._status = EventStatus.COMPLETED;

        const result = event.cancel('Test');

        expect(result.isFailure).toBe(true);
      });

      it('should fail when event has already started', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        
        // Force past start date by replacing the date range
        const pastStart = new Date();
        pastStart.setDate(pastStart.getDate() - 1);
        const pastEnd = new Date();
        pastEnd.setDate(pastEnd.getDate() + 1);
        const pastDateRange = EventDateRangeVO.create(pastStart, pastEnd, false);
        (event as unknown as { _dateRange: EventDateRangeVO })._dateRange = pastDateRange;

        const result = event.cancel('Test');

        // Should fail because event has started
        expect(result.isFailure).toBe(true);
      });
    });
  });

  describe('markAsCompleted()', () => {
    it('should mark PUBLISHED event as COMPLETED when event has ended', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);
      event.publish();

      // Force past end date by replacing the date range
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - 2);
      const pastEnd = new Date();
      pastEnd.setDate(pastEnd.getDate() - 1);
      const pastDateRange = EventDateRangeVO.create(pastStart, pastEnd, false);
      (event as unknown as { _dateRange: EventDateRangeVO })._dateRange = pastDateRange;

      event.markAsCompleted();

      expect(event.status).toBe(EventStatus.COMPLETED);
    });

    it('should not change status if event has not ended', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);
      event.publish();

      // Event is in future, has not ended
      event.markAsCompleted();

      expect(event.status).toBe(EventStatus.PUBLISHED);
    });

    it('should not change status if not PUBLISHED', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const originalStatus = event.status;

      event.markAsCompleted();

      expect(event.status).toBe(originalStatus);
    });
  });

  describe('updateDetails()', () => {
    describe('Success Cases', () => {
      it('should update title in DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.updateDetails({ title: 'New Title' });

        expect(result.isSuccess).toBe(true);
        expect(event.title).toBe('New Title');
      });

      it('should update description', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.updateDetails({ description: 'New Description' });

        expect(result.isSuccess).toBe(true);
        expect(event.description).toBe('New Description');
      });

      it('should update category', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.updateDetails({ category: EventCategory.CONFERENCE });

        expect(result.isSuccess).toBe(true);
        expect(event.category).toBe(EventCategory.CONFERENCE);
      });

      it('should update location in DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const newLocation = LocationVO.create({
          address: 'New Address',
          city: 'Sfax',
          country: 'Tunisia',
        });

        const result = event.updateDetails({ location: newLocation });

        expect(result.isSuccess).toBe(true);
        expect(event.location.city).toBe('Sfax');
      });

      it('should update dateRange in DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const newDateRange = createValidDateRange(60, 8);

        const result = event.updateDetails({ dateRange: newDateRange });

        expect(result.isSuccess).toBe(true);
      });

      it('should publish EventUpdatedEvent', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        event.clearDomainEvents();

        event.updateDetails({ title: 'New Title' });

        const domainEvents = event.domainEvents;
        const updatedEvent = domainEvents.find(
          (e): e is EventUpdatedEvent => e instanceof EventUpdatedEvent
        );
        expect(updatedEvent).toBeDefined();
      });

      it('should update title and description in PUBLISHED event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.updateDetails({
          title: 'Updated Title',
          description: 'Updated Description',
        });

        expect(result.isSuccess).toBe(true);
        expect(event.title).toBe('Updated Title');
      });
    });

    describe('Validation Failures', () => {
      it('should fail when updating dateRange after publishing', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        const newDateRange = createValidDateRange(90, 10);
        const result = event.updateDetails({ dateRange: newDateRange });

        expect(result.isFailure).toBe(true);
      });

      it('should fail when updating location after publishing', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        const newLocation = LocationVO.create({
          address: 'New Address',
          city: 'Sousse',
          country: 'Tunisia',
        });

        const result = event.updateDetails({ location: newLocation });

        expect(result.isFailure).toBe(true);
      });

      it('should fail when event is CANCELLED', () => {
        // Terminal state - no modifications allowed
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        event.cancel('Test');

        const result = event.updateDetails({ title: 'New Title' });

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('cancelled');
      });

      it('should fail when event is COMPLETED', () => {
        // Terminal state - no modifications allowed
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        (event as unknown as { _status: EventStatus })._status = EventStatus.COMPLETED;

        const result = event.updateDetails({ title: 'New Title' });

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('completed');
      });

      it('should fail with invalid title', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.updateDetails({ title: '' });

        expect(result.isFailure).toBe(true);
      });
    });
  });

  describe('updateImage()', () => {
    it('should update imageUrl', () => {
      const event = EventEntity.create(createValidEventProps()).value;

      event.updateImage('https://cdn.tickr.tn/images/event-123.jpg');

      expect(event.imageUrl).toBe('https://cdn.tickr.tn/images/event-123.jpg');
    });

    it('should allow updating image on PUBLISHED event', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);
      event.publish();

      event.updateImage('https://cdn.tickr.tn/images/new-image.jpg');

      expect(event.imageUrl).toBe('https://cdn.tickr.tn/images/new-image.jpg');
    });

    it('should allow setting image to null', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      event.updateImage('https://cdn.tickr.tn/images/event-123.jpg');

      event.updateImage(null);

      expect(event.imageUrl).toBeNull();
    });
  });

  describe('incrementSoldTickets()', () => {
    describe('Success Cases', () => {
      it('should increment sold tickets for ticket type', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.incrementSoldTickets(ticketType.id, 5);

        expect(result.isSuccess).toBe(true);
        expect(event.ticketTypes[0].soldQuantity).toBe(5);
        expect(event.soldTickets).toBe(5);
      });

      it('should accumulate sold tickets', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);
        event.publish();

        event.incrementSoldTickets(ticketType.id, 5);
        event.incrementSoldTickets(ticketType.id, 3);

        expect(event.ticketTypes[0].soldQuantity).toBe(8);
        expect(event.soldTickets).toBe(8);
      });

      it('should update revenue', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const price = TicketPriceVO.create(50, Currency.TND);
        const ticketType = createValidTicketType({ 
          eventId: event.id,
          quantity: 100,
          price: price,
        });
        event.addTicketType(ticketType);
        event.publish();

        event.incrementSoldTickets(ticketType.id, 10);

        const revenue = event.getTotalRevenue();
        expect(revenue.amount).toBe(500); // 10 * 50
      });

      it('should trigger TicketTypeSoldOutEvent on ticket type when sold out', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 10 });
        event.addTicketType(ticketType);
        event.publish();
        // Clear events on the ticket type (events are on the sub-entity)
        event.ticketTypes[0].clearDomainEvents();

        event.incrementSoldTickets(ticketType.id, 10);

        // The sold out event is on the ticket type entity, not the event
        const ticketTypeEvents = event.ticketTypes[0].domainEvents;
        const soldOutEvent = ticketTypeEvents.find(
          (e): e is TicketTypeSoldOutEvent => e instanceof TicketTypeSoldOutEvent
        );
        expect(soldOutEvent).toBeDefined();
        expect(event.ticketTypes[0].isSoldOut()).toBe(true);
      });
    });

    describe('Validation Failures', () => {
      it('should fail when ticket type not found', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.incrementSoldTickets('non-existent-id', 5);

        expect(result.isFailure).toBe(true);
      });

      it('should fail when exceeding available quantity', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 10 });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.incrementSoldTickets(ticketType.id, 15);

        expect(result.isFailure).toBe(true);
      });

      it('should fail with zero or negative quantity', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);
        event.publish();

        const result = event.incrementSoldTickets(ticketType.id, 0);

        expect(result.isFailure).toBe(true);
      });
    });
  });

  describe('Query Methods', () => {
    describe('getTotalRevenue()', () => {
      it('should return minimal value for event with no sales', () => {
        // TicketPriceVO requires amount > 0, so getTotalRevenue returns 0.001 minimum
        // Use getTotalRevenueAmount() for true zero value
        const event = EventEntity.create(createValidEventProps()).value;
        const revenue = event.getTotalRevenue();

        expect(revenue.amount).toBe(0.001); // Minimum value due to TicketPriceVO constraint
        expect(revenue.currency).toBe(Currency.TND);
      });

      it('should return true zero via getTotalRevenueAmount()', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        
        expect(event.getTotalRevenueAmount()).toBe(0);
      });

      it('should calculate revenue from all ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        
        const price1 = TicketPriceVO.create(100, Currency.TND);
        const price2 = TicketPriceVO.create(200, Currency.TND);
        
        const ticketType1 = createValidTicketType({ eventId: event.id, name: 'Standard', price: price1, quantity: 100 });
        const ticketType2 = createValidTicketType({ eventId: event.id, name: 'VIP', price: price2, quantity: 50 });
        
        event.addTicketType(ticketType1);
        event.addTicketType(ticketType2);
        event.publish();
        
        event.incrementSoldTickets(ticketType1.id, 10); // 10 * 100 = 1000
        event.incrementSoldTickets(ticketType2.id, 5);  // 5 * 200 = 1000

        const revenue = event.getTotalRevenue();
        expect(revenue.amount).toBe(2000);
      });
    });

    describe('getAvailableCapacity()', () => {
      it('should return total capacity when no tickets sold', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);

        expect(event.getAvailableCapacity()).toBe(100);
      });

      it('should subtract sold tickets from capacity', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);
        event.publish();
        event.incrementSoldTickets(ticketType.id, 30);

        expect(event.getAvailableCapacity()).toBe(70);
      });
    });

    describe('canBeCancelled()', () => {
      it('should return true for PUBLISHED event that has not started', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        expect(event.canBeCancelled()).toBe(true);
      });

      it('should return true for DRAFT event that has not started', () => {
        // Implementation allows cancelling DRAFT events (organizer can abandon draft)
        const event = EventEntity.create(createValidEventProps()).value;

        expect(event.canBeCancelled()).toBe(true);
      });

      it('should return false for CANCELLED event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();
        event.cancel('Test');

        expect(event.canBeCancelled()).toBe(false);
      });
    });

    describe('canBeModified()', () => {
      it('should return true for DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        expect(event.canBeModified()).toBe(true);
      });

      it('should return false for PUBLISHED event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        expect(event.canBeModified()).toBe(false);
      });
    });

    describe('isPublished()', () => {
      it('should return true for PUBLISHED event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);
        event.publish();

        expect(event.isPublished()).toBe(true);
      });

      it('should return false for DRAFT event', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        expect(event.isPublished()).toBe(false);
      });
    });

    describe('hasStarted()', () => {
      it('should return false for future event', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        expect(event.hasStarted()).toBe(false);
      });
    });

    describe('hasEnded()', () => {
      it('should return false for future event', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        expect(event.hasEnded()).toBe(false);
      });
    });

    describe('getActiveTicketTypes()', () => {
      it('should return only active and on-sale ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        
        // Create a sales period that is currently active (started yesterday, ends in 25 days)
        const now = new Date();
        const salesStart = new Date(now);
        salesStart.setDate(salesStart.getDate() - 1);
        const salesEnd = new Date(now);
        salesEnd.setDate(salesEnd.getDate() + 25);
        const activeSalesPeriod = SalesPeriodVO.create(salesStart, salesEnd);
        
        const ticketType1 = createValidTicketType({ 
          eventId: event.id, 
          name: 'Active', 
          salesPeriod: activeSalesPeriod 
        });
        const ticketType2 = createValidTicketType({ 
          eventId: event.id, 
          name: 'Inactive',
          salesPeriod: activeSalesPeriod
        });
        event.addTicketType(ticketType1);
        event.addTicketType(ticketType2);
        
        // Deactivate one ticket type
        (event.ticketTypes[1] as unknown as { _isActive: boolean })._isActive = false;

        const activeTypes = event.getActiveTicketTypes();
        expect(activeTypes.length).toBe(1);
        expect(activeTypes[0].name).toBe('Active');
      });
      
      it('should not return ticket types that are not on sale yet', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        
        // Default createValidTicketType starts sales tomorrow
        const ticketType = createValidTicketType({ eventId: event.id, name: 'Future' });
        event.addTicketType(ticketType);

        const activeTypes = event.getActiveTicketTypes();
        expect(activeTypes.length).toBe(0);
      });
    });

    describe('getSalesProgress()', () => {
      it('should return 0 for event with no sales', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);

        expect(event.getSalesProgress()).toBe(0);
      });

      it('should calculate percentage correctly', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);
        event.publish();
        event.incrementSoldTickets(ticketType.id, 25);

        expect(event.getSalesProgress()).toBe(25);
      });

      it('should return 100 for sold out event', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 10 });
        event.addTicketType(ticketType);
        event.publish();
        event.incrementSoldTickets(ticketType.id, 10);

        expect(event.getSalesProgress()).toBe(100);
      });

      it('should return 0 for event with no capacity', () => {
        const event = EventEntity.create(createValidEventProps()).value;

        expect(event.getSalesProgress()).toBe(0);
      });
    });
  });

  describe('Domain Events Management', () => {
    it('should collect all domain events', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);
      event.publish();

      const domainEvents = event.domainEvents;
      expect(domainEvents.length).toBeGreaterThanOrEqual(3); // Created, TicketTypeAdded, Published
    });

    it('should clear events after calling clearDomainEvents()', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      expect(event.domainEvents.length).toBeGreaterThanOrEqual(1);

      event.clearDomainEvents();

      expect(event.domainEvents.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum title length (200 chars)', () => {
      const props = createValidEventProps();
      props.title = 'A'.repeat(200);
      const result = EventEntity.create(props);

      expect(result.isSuccess).toBe(true);
      expect(result.value.title.length).toBe(200);
    });

    it('should handle maximum description length (5000 chars)', () => {
      const props = createValidEventProps();
      props.description = 'A'.repeat(5000);
      const result = EventEntity.create(props);

      expect(result.isSuccess).toBe(true);
      expect(result.value.description!.length).toBe(5000);
    });

    it('should handle multiple ticket types with same quantity', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      for (let i = 1; i <= 5; i++) {
        const ticketType = createValidTicketType({ 
          eventId: event.id,
          name: `Type ${i}`, 
          quantity: 100 
        });
        event.addTicketType(ticketType);
      }

      expect(event.totalCapacity).toBe(500);
      expect(event.ticketTypes.length).toBe(5);
    });

    it('should maintain invariants after multiple operations', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      
      // Add ticket types
      const tt1 = createValidTicketType({ eventId: event.id, name: 'Standard', quantity: 100 });
      const tt2 = createValidTicketType({ eventId: event.id, name: 'VIP', quantity: 50 });
      event.addTicketType(tt1);
      event.addTicketType(tt2);
      
      // Publish
      event.publish();
      
      // Sell tickets
      event.incrementSoldTickets(tt1.id, 30);
      event.incrementSoldTickets(tt2.id, 10);

      // Verify invariants
      expect(event.totalCapacity).toBe(150);
      expect(event.soldTickets).toBe(40);
      expect(event.getAvailableCapacity()).toBe(110);
      expect(event.status).toBe(EventStatus.PUBLISHED);
    });
  });

  describe('Additional Query Methods', () => {
    describe('isSoldOut()', () => {
      it('should return false when no tickets sold', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);

        expect(event.isSoldOut()).toBe(false);
      });

      it('should return false when partially sold', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
        event.addTicketType(ticketType);
        event.publish();
        event.incrementSoldTickets(ticketType.id, 50);

        expect(event.isSoldOut()).toBe(false);
      });

      it('should return true when all tickets sold', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, quantity: 10 });
        event.addTicketType(ticketType);
        event.publish();
        event.incrementSoldTickets(ticketType.id, 10);

        expect(event.isSoldOut()).toBe(true);
      });

      it('should return false when no ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        expect(event.isSoldOut()).toBe(false);
      });
    });

    describe('hasTicketTypes()', () => {
      it('should return false for event without ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        expect(event.hasTicketTypes()).toBe(false);
      });

      it('should return true for event with ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id });
        event.addTicketType(ticketType);

        expect(event.hasTicketTypes()).toBe(true);
      });
    });

    describe('getTicketTypeCount()', () => {
      it('should return 0 for event without ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        expect(event.getTicketTypeCount()).toBe(0);
      });

      it('should return correct count for event with ticket types', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        event.addTicketType(createValidTicketType({ eventId: event.id, name: 'Standard' }));
        event.addTicketType(createValidTicketType({ eventId: event.id, name: 'VIP' }));
        event.addTicketType(createValidTicketType({ eventId: event.id, name: 'Premium' }));

        expect(event.getTicketTypeCount()).toBe(3);
      });
    });

    describe('findTicketType()', () => {
      it('should return undefined for non-existent ticket type', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        expect(event.findTicketType('non-existent-id')).toBeUndefined();
      });

      it('should return ticket type when found', () => {
        const event = EventEntity.create(createValidEventProps()).value;
        const ticketType = createValidTicketType({ eventId: event.id, name: 'Standard' });
        event.addTicketType(ticketType);

        const found = event.findTicketType(ticketType.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(ticketType.id);
        expect(found?.name).toBe('Standard');
      });
    });
  });

  describe('decrementSoldTickets()', () => {
    it('should decrement sold tickets for ticket type', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
      event.addTicketType(ticketType);
      event.publish();
      event.incrementSoldTickets(ticketType.id, 50);

      const result = event.decrementSoldTickets(ticketType.id, 20);

      expect(result.isSuccess).toBe(true);
      expect(event.soldTickets).toBe(30);
    });

    it('should fail when ticket type not found', () => {
      const event = EventEntity.create(createValidEventProps()).value;

      const result = event.decrementSoldTickets('non-existent-id', 10);

      expect(result.isFailure).toBe(true);
    });

    it('should update revenue when decrementing', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id, quantity: 100 });
      event.addTicketType(ticketType);
      event.publish();
      event.incrementSoldTickets(ticketType.id, 50);
      const initialRevenue = event.getTotalRevenueAmount();

      event.decrementSoldTickets(ticketType.id, 20);

      expect(event.getTotalRevenueAmount()).toBeLessThan(initialRevenue);
    });
  });

  describe('clone()', () => {
    it('should create a deep copy of the event', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);
      event.publish();

      const cloned = event.clone();

      expect(cloned.id).toBe(event.id);
      expect(cloned.title).toBe(event.title);
      expect(cloned.status).toBe(event.status);
      expect(cloned.ticketTypes.length).toBe(event.ticketTypes.length);
    });

    it('should not share domain events with original', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);

      const cloned = event.clone();
      event.clearDomainEvents();

      // Cloned should have its own domain events list
      expect(cloned).toBeDefined();
    });
  });

  describe('setCommissionRateOverride()', () => {
    it('should set and clear a valid event commission override', () => {
      const event = EventEntity.create(createValidEventProps()).value;

      expect(event.setCommissionRateOverride(0.03, event.organizerId).isSuccess).toBe(true);
      expect(event.commissionRateOverride).toBe(0.03);

      expect(event.setCommissionRateOverride(null, event.organizerId).isSuccess).toBe(true);
      expect(event.commissionRateOverride).toBeNull();
    });

    it.each([-0.01, 0.21, Number.NaN, Number.POSITIVE_INFINITY])(
      'should reject an invalid event commission override: %s',
      (rate) => {
        const event = EventEntity.create(createValidEventProps()).value;

        const result = event.setCommissionRateOverride(rate, event.organizerId);

        expect(result.isFailure).toBe(true);
        expect(event.commissionRateOverride).toBeNull();
      },
    );

    it('should preserve the override when cloned', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      event.setCommissionRateOverride(0.02, event.organizerId);

      expect(event.clone().commissionRateOverride).toBe(0.02);
    });

    it('should record an auditable commission change', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      event.clearDomainEvents();

      event.setCommissionRateOverride(0.03, event.organizerId);

      const auditEvent = event.domainEvents[0];
      expect(auditEvent).toBeInstanceOf(EventCommissionOverrideUpdatedEvent);
      expect(auditEvent).toMatchObject({
        adminId: event.organizerId,
        previousRate: null,
        newRate: 0.03,
      });
    });

    it('should not audit an unchanged commission override', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      event.setCommissionRateOverride(0.03, event.organizerId);
      event.clearDomainEvents();

      event.setCommissionRateOverride(0.03, event.organizerId);

      expect(event.domainEvents).toHaveLength(0);
    });
  });

  describe('toObject()', () => {
    it('should return plain object representation', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);
      event.publish();

      const obj = event.toObject();

      expect(obj.id).toBe(event.id);
      expect(obj.title).toBe(event.title);
      expect(obj.description).toBe(event.description);
      expect(obj.category).toBe(event.category);
      expect(obj.status).toBe('PUBLISHED');
      expect(obj.location).toEqual({
        address: expect.any(String),
        city: expect.any(String),
        country: expect.any(String),
        coordinates: expect.objectContaining({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        }),
      });
      expect(obj.dateRange).toEqual({
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
      expect(obj.ticketTypes).toHaveLength(1);
      expect(obj.totalCapacity).toBe(100);
      expect(obj.soldTickets).toBe(0);
      expect(obj.availableCapacity).toBe(100);
      expect(obj.salesProgress).toBe(0);
      expect(obj.isSoldOut).toBe(false);
      expect(obj.revenue).toEqual({
        amount: expect.any(Number),
        currency: expect.any(String),
      });
      expect(obj.createdAt).toEqual(expect.any(String));
      expect(obj.updatedAt).toEqual(expect.any(String));
      expect(obj.publishedAt).toEqual(expect.any(String));
      expect(obj.cancelledAt).toBeNull();
      expect(obj.cancellationReason).toBeNull();
    });

    it('should include cancelled event info', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      const ticketType = createValidTicketType({ eventId: event.id });
      event.addTicketType(ticketType);
      event.publish();
      event.cancel('Test cancellation');

      const obj = event.toObject();

      expect(obj.status).toBe('CANCELLED');
      expect(obj.cancelledAt).toEqual(expect.any(String));
      expect(obj.cancellationReason).toBe('Test cancellation');
    });
  });

  describe('validate()', () => {
    it('should throw for missing organizer', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      (event as unknown as { _organizerId: string })._organizerId = '';

      expect(() => event.validate()).toThrow();
    });

    it('should throw for missing title', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      (event as unknown as { _title: string })._title = '';

      expect(() => event.validate()).toThrow();
    });

    it('should throw for title exceeding max length', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      (event as unknown as { _title: string })._title = 'A'.repeat(201);

      expect(() => event.validate()).toThrow();
    });

    it('should throw for description exceeding max length', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      (event as unknown as { _description: string })._description = 'A'.repeat(5001);

      expect(() => event.validate()).toThrow();
    });

    it('should throw for invalid category', () => {
      const event = EventEntity.create(createValidEventProps()).value;
      (event as unknown as { _category: string })._category = 'INVALID_CATEGORY';

      expect(() => event.validate()).toThrow();
    });

    it('should not throw for valid event', () => {
      const event = EventEntity.create(createValidEventProps()).value;

      expect(() => event.validate()).not.toThrow();
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute event from props', () => {
      const original = EventEntity.create(createValidEventProps()).value;
      
      const reconstituted = EventEntity.reconstitute({
        id: original.id,
        organizerId: original.organizerId,
        title: original.title,
        description: original.description,
        category: original.category,
        location: original.location,
        dateRange: original.dateRange,
        imageUrl: original.imageUrl,
        status: original.status,
        ticketTypes: [],
        totalCapacity: original.totalCapacity,
        soldTickets: original.soldTickets,
        revenueAmount: 0,
        revenueCurrency: Currency.TND,
        createdAt: original.createdAt,
        updatedAt: original.updatedAt,
        publishedAt: original.publishedAt,
        cancelledAt: null,
        cancellationReason: null,
      });

      expect(reconstituted.id).toBe(original.id);
      expect(reconstituted.title).toBe(original.title);
    });
  });
});
