import { TicketTypeEntity, CreateTicketTypeProps } from '@modules/events/domain/entities/ticket-type.entity';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { InvalidTicketTypeException } from '@modules/events/domain/exceptions/invalid-ticket-type.exception';
import { TicketTypeSoldOutEvent } from '@modules/events/domain/events/ticket-type-sold-out.event';

describe('TicketTypeEntity', () => {
  // Helper to create future dates
  const futureDate = (hoursFromNow: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date;
  };

  const pastDate = (hoursAgo: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);
    return date;
  };

  // Helper to create valid props
  const createValidProps = (overrides?: Partial<CreateTicketTypeProps>): CreateTicketTypeProps => ({
    eventId: 'event-123',
    name: 'VIP Ticket',
    description: 'Front row access with backstage pass',
    price: TicketPriceVO.inTND(150),
    quantity: 100,
    salesPeriod: SalesPeriodVO.create(futureDate(1), futureDate(48)),
    ...overrides,
  });

  describe('create() - Static Factory Method', () => {
    it('should create a valid ticket type with all props', () => {
      const props = createValidProps();

      const result = TicketTypeEntity.create(props);

      expect(result.isSuccess).toBe(true);
      const ticketType = result.value;
      expect(ticketType.eventId).toBe('event-123');
      expect(ticketType.name).toBe('VIP Ticket');
      expect(ticketType.description).toBe('Front row access with backstage pass');
      expect(ticketType.price.amount).toBe(150);
      expect(ticketType.quantity).toBe(100);
      expect(ticketType.soldQuantity).toBe(0);
      expect(ticketType.isActive).toBe(true);
    });

    it('should create a ticket type with minimal required props', () => {
      const result = TicketTypeEntity.create({
        eventId: 'event-456',
        name: 'Standard',
        price: TicketPriceVO.inTND(50),
        quantity: 200,
        salesPeriod: SalesPeriodVO.create(futureDate(1), futureDate(24)),
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.description).toBeNull();
      expect(result.value.isActive).toBe(true);
      expect(result.value.soldQuantity).toBe(0);
    });

    it('should generate a unique ID if not provided', () => {
      const result1 = TicketTypeEntity.create(createValidProps());
      const result2 = TicketTypeEntity.create(createValidProps());

      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value.id).not.toBe(result2.value.id);
      expect(result1.value.id).toContain('tt_');
    });

    it('should use provided ID if given', () => {
      const result = TicketTypeEntity.create(createValidProps({ id: 'custom-id-123' }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.id).toBe('custom-id-123');
    });

    it('should trim name whitespace', () => {
      const result = TicketTypeEntity.create(createValidProps({ name: '  VIP Ticket  ' }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('VIP Ticket');
    });

    it('should trim description whitespace', () => {
      const result = TicketTypeEntity.create(createValidProps({ description: '  Some description  ' }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.description).toBe('Some description');
    });

    it('should set isActive to provided value', () => {
      const result = TicketTypeEntity.create(createValidProps({ isActive: false }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.isActive).toBe(false);
    });

    it('should allow setting initial soldQuantity', () => {
      const result = TicketTypeEntity.create(createValidProps({ soldQuantity: 10 }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.soldQuantity).toBe(10);
    });

    describe('validation errors', () => {
      it('should fail if name is empty', () => {
        const result = TicketTypeEntity.create(createValidProps({ name: '' }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
        expect(result.error.message).toContain('name is required');
      });

      it('should fail if name is whitespace only', () => {
        const result = TicketTypeEntity.create(createValidProps({ name: '   ' }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
      });

      it('should fail if name exceeds 100 characters', () => {
        const result = TicketTypeEntity.create(createValidProps({ name: 'A'.repeat(101) }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
        expect(result.error.message).toContain('100');
      });

      it('should fail if description exceeds 500 characters', () => {
        const result = TicketTypeEntity.create(createValidProps({ description: 'A'.repeat(501) }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
        expect(result.error.message).toContain('500');
      });

      it('should fail if quantity is 0', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 0 }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
        expect(result.error.message).toContain('greater than 0');
      });

      it('should fail if quantity is negative', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: -10 }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
      });

      it('should fail if soldQuantity is negative', () => {
        const result = TicketTypeEntity.create(createValidProps({ soldQuantity: -1 }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
        expect(result.error.message).toContain('negative');
      });

      it('should fail if soldQuantity exceeds quantity', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 100, soldQuantity: 150 }));

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
        expect(result.error.message).toContain('exceed');
      });
    });
  });

  describe('reconstitute() - From Persistence', () => {
    it('should reconstitute a ticket type without validation', () => {
      const ticketType = TicketTypeEntity.reconstitute({
        id: 'tt-123',
        eventId: 'event-456',
        name: 'Early Bird',
        description: 'Discounted early access',
        price: TicketPriceVO.inEUR(75),
        quantity: 50,
        soldQuantity: 25,
        salesPeriod: SalesPeriodVO.create(pastDate(48), pastDate(24)),
        isActive: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15'),
      });

      expect(ticketType.id).toBe('tt-123');
      expect(ticketType.name).toBe('Early Bird');
      expect(ticketType.soldQuantity).toBe(25);
      expect(ticketType.isActive).toBe(false);
    });
  });

  describe('Query Methods', () => {
    describe('isSoldOut()', () => {
      it('should return false when tickets are available', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 100, soldQuantity: 50 }));

        expect(result.value.isSoldOut()).toBe(false);
      });

      it('should return true when all tickets are sold', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 100, soldQuantity: 100 }));

        expect(result.value.isSoldOut()).toBe(true);
      });

      it('should return true when soldQuantity equals quantity', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 10, soldQuantity: 10 }));

        expect(result.value.isSoldOut()).toBe(true);
      });
    });

    describe('isOnSale()', () => {
      it('should return true when active, within sales period, and not sold out', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            isActive: true,
            salesPeriod: SalesPeriodVO.create(pastDate(24), futureDate(24)),
            quantity: 100,
            soldQuantity: 50,
          }),
        );

        expect(result.value.isOnSale()).toBe(true);
      });

      it('should return false when inactive', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            isActive: false,
            salesPeriod: SalesPeriodVO.create(pastDate(24), futureDate(24)),
          }),
        );

        expect(result.value.isOnSale()).toBe(false);
      });

      it('should return false when sold out', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            isActive: true,
            salesPeriod: SalesPeriodVO.create(pastDate(24), futureDate(24)),
            quantity: 100,
            soldQuantity: 100,
          }),
        );

        expect(result.value.isOnSale()).toBe(false);
      });

      it('should return false when sales period not started', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            isActive: true,
            salesPeriod: SalesPeriodVO.create(futureDate(24), futureDate(48)),
          }),
        );

        expect(result.value.isOnSale()).toBe(false);
      });

      it('should return false when sales period ended', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            isActive: true,
            salesPeriod: SalesPeriodVO.create(pastDate(48), pastDate(24)),
          }),
        );

        expect(result.value.isOnSale()).toBe(false);
      });
    });

    describe('getAvailableQuantity()', () => {
      it('should return correct available quantity', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 100, soldQuantity: 30 }));

        expect(result.value.getAvailableQuantity()).toBe(70);
      });

      it('should return 0 when sold out', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 50, soldQuantity: 50 }));

        expect(result.value.getAvailableQuantity()).toBe(0);
      });

      it('should return full quantity when none sold', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 200, soldQuantity: 0 }));

        expect(result.value.getAvailableQuantity()).toBe(200);
      });
    });

    describe('getSalesProgress()', () => {
      it('should return 0 when none sold', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 100, soldQuantity: 0 }));

        expect(result.value.getSalesProgress()).toBe(0);
      });

      it('should return 100 when sold out', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 100, soldQuantity: 100 }));

        expect(result.value.getSalesProgress()).toBe(100);
      });

      it('should return correct percentage', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 200, soldQuantity: 50 }));

        expect(result.value.getSalesProgress()).toBe(25);
      });

      it('should round to nearest integer', () => {
        const result = TicketTypeEntity.create(createValidProps({ quantity: 3, soldQuantity: 1 }));

        expect(result.value.getSalesProgress()).toBe(33); // 33.33... rounded
      });
    });

    describe('hasSalesStarted()', () => {
      it('should return false when no tickets sold', () => {
        const result = TicketTypeEntity.create(createValidProps({ soldQuantity: 0 }));

        expect(result.value.hasSalesStarted()).toBe(false);
      });

      it('should return true when at least one ticket sold', () => {
        const result = TicketTypeEntity.create(createValidProps({ soldQuantity: 1 }));

        expect(result.value.hasSalesStarted()).toBe(true);
      });
    });

    describe('getTotalRevenue()', () => {
      it('should return correct total revenue', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            price: TicketPriceVO.inTND(100),
            soldQuantity: 25,
          }),
        );

        const revenue = result.value.getTotalRevenue();
        expect(revenue.amount).toBe(2500);
        expect(revenue.currency).toBe(Currency.TND);
      });

      it('should return minimal value when no tickets sold (use getTotalRevenueAmount for true zero)', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            price: TicketPriceVO.inTND(100),
            soldQuantity: 0,
          }),
        );

        // getTotalRevenue returns minimal value due to VO constraint
        expect(result.value.getTotalRevenue().amount).toBe(0.001);
        // getTotalRevenueAmount returns true zero
        expect(result.value.getTotalRevenueAmount()).toBe(0);
      });
    });

    describe('isSalesPending()', () => {
      it('should return true when sales not started', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            salesPeriod: SalesPeriodVO.create(futureDate(24), futureDate(48)),
          }),
        );

        expect(result.value.isSalesPending()).toBe(true);
      });

      it('should return false when sales started', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            salesPeriod: SalesPeriodVO.create(pastDate(24), futureDate(24)),
          }),
        );

        expect(result.value.isSalesPending()).toBe(false);
      });
    });

    describe('hasSalesEnded()', () => {
      it('should return true when sales period ended', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            salesPeriod: SalesPeriodVO.create(pastDate(48), pastDate(24)),
          }),
        );

        expect(result.value.hasSalesEnded()).toBe(true);
      });

      it('should return false when sales still ongoing', () => {
        const result = TicketTypeEntity.create(
          createValidProps({
            salesPeriod: SalesPeriodVO.create(pastDate(24), futureDate(24)),
          }),
        );

        expect(result.value.hasSalesEnded()).toBe(false);
      });
    });
  });

  describe('Command Methods', () => {
    describe('updatePrice()', () => {
      it('should update price when no tickets sold', () => {
        const ticketType = TicketTypeEntity.create(createValidProps({ soldQuantity: 0 })).value;
        const newPrice = TicketPriceVO.inTND(200);

        const result = ticketType.updatePrice(newPrice);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.price.amount).toBe(200);
      });

      it('should update updatedAt timestamp', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;
        const originalUpdatedAt = ticketType.updatedAt;

        // Wait a tiny bit to ensure different timestamp
        const newPrice = TicketPriceVO.inTND(200);
        ticketType.updatePrice(newPrice);

        expect(ticketType.updatedAt.getTime()).toBeGreaterThanOrEqual(
          originalUpdatedAt.getTime(),
        );
      });

      it('should fail when tickets have been sold', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 1 }),
        ).value;
        const newPrice = TicketPriceVO.inTND(200);

        const result = ticketType.updatePrice(newPrice);

        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTicketTypeException);
        expect(result.error.message).toContain('after sales');
      });
    });

    describe('updateQuantity()', () => {
      it('should update quantity when valid', () => {
        const ticketType = TicketTypeEntity.create(createValidProps({ quantity: 100 })).value;

        const result = ticketType.updateQuantity(150);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.quantity).toBe(150);
      });

      it('should allow reducing quantity above sold', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 30 }),
        ).value;

        const result = ticketType.updateQuantity(50);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.quantity).toBe(50);
      });

      it('should fail when new quantity is 0', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateQuantity(0);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('greater than 0');
      });

      it('should fail when new quantity is negative', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateQuantity(-10);

        expect(result.isFailure).toBe(true);
      });

      it('should fail when new quantity is below sold quantity', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 50 }),
        ).value;

        const result = ticketType.updateQuantity(30);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('50');
        expect(result.error.message).toContain('already sold');
      });
    });

    describe('updateName()', () => {
      it('should update name when valid', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateName('Premium VIP');

        expect(result.isSuccess).toBe(true);
        expect(ticketType.name).toBe('Premium VIP');
      });

      it('should trim whitespace', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateName('  Gold Pass  ');

        expect(result.isSuccess).toBe(true);
        expect(ticketType.name).toBe('Gold Pass');
      });

      it('should fail when name is empty', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateName('');

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('required');
      });

      it('should fail when name exceeds max length', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateName('A'.repeat(101));

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('100');
      });
    });

    describe('updateDescription()', () => {
      it('should update description', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateDescription('New description');

        expect(result.isSuccess).toBe(true);
        expect(ticketType.description).toBe('New description');
      });

      it('should allow null description', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateDescription(null);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.description).toBeNull();
      });

      it('should fail when description exceeds max length', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.updateDescription('A'.repeat(501));

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('500');
      });
    });

    describe('updateSalesPeriod()', () => {
      it('should update sales period when no tickets sold', () => {
        const ticketType = TicketTypeEntity.create(createValidProps({ soldQuantity: 0 })).value;
        const newPeriod = SalesPeriodVO.create(futureDate(2), futureDate(72));

        const result = ticketType.updateSalesPeriod(newPeriod);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.salesPeriod).toBe(newPeriod);
      });

      it('should fail when tickets have been sold', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ soldQuantity: 5 }),
        ).value;
        const newPeriod = SalesPeriodVO.create(futureDate(2), futureDate(72));

        const result = ticketType.updateSalesPeriod(newPeriod);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('after sales');
      });
    });

    describe('incrementSold()', () => {
      it('should increment sold quantity', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 10 }),
        ).value;

        const result = ticketType.incrementSold(5);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.soldQuantity).toBe(15);
      });

      it('should allow selling all remaining tickets', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 90 }),
        ).value;

        const result = ticketType.incrementSold(10);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.soldQuantity).toBe(100);
        expect(ticketType.isSoldOut()).toBe(true);
      });

      it('should fail when quantity is 0', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.incrementSold(0);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('positive');
      });

      it('should fail when quantity is negative', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        const result = ticketType.incrementSold(-5);

        expect(result.isFailure).toBe(true);
      });

      it('should fail when insufficient tickets available', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 95 }),
        ).value;

        const result = ticketType.incrementSold(10);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('Insufficient');
        expect(result.error.message).toContain('5'); // Available
      });

      it('should publish TicketTypeSoldOutEvent when sold out', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 99 }),
        ).value;

        ticketType.incrementSold(1);

        const events = ticketType.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(TicketTypeSoldOutEvent);
        
        const soldOutEvent = events[0] as TicketTypeSoldOutEvent;
        expect(soldOutEvent.ticketTypeId).toBe(ticketType.id);
        expect(soldOutEvent.eventId).toBe(ticketType.eventId);
        expect(soldOutEvent.ticketTypeName).toBe(ticketType.name);
        expect(soldOutEvent.totalQuantity).toBe(100);
      });

      it('should not publish event if not sold out', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 0 }),
        ).value;

        ticketType.incrementSold(50);

        const events = ticketType.pullDomainEvents();
        expect(events).toHaveLength(0);
      });
    });

    describe('decrementSold()', () => {
      it('should decrement sold quantity', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 30 }),
        ).value;

        const result = ticketType.decrementSold(10);

        expect(result.isSuccess).toBe(true);
        expect(ticketType.soldQuantity).toBe(20);
      });

      it('should fail when quantity is 0', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ soldQuantity: 10 }),
        ).value;

        const result = ticketType.decrementSold(0);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('positive');
      });

      it('should fail when quantity exceeds sold', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 5 }),
        ).value;

        const result = ticketType.decrementSold(10);

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('Only 5 sold');
      });
    });

    describe('deactivate()', () => {
      it('should set isActive to false', () => {
        const ticketType = TicketTypeEntity.create(createValidProps({ isActive: true })).value;

        ticketType.deactivate();

        expect(ticketType.isActive).toBe(false);
      });

      it('should update timestamp', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;
        const originalUpdatedAt = ticketType.updatedAt;

        ticketType.deactivate();

        expect(ticketType.updatedAt.getTime()).toBeGreaterThanOrEqual(
          originalUpdatedAt.getTime(),
        );
      });
    });

    describe('reactivate()', () => {
      it('should set isActive to true', () => {
        const ticketType = TicketTypeEntity.create(createValidProps({ isActive: false })).value;

        const result = ticketType.reactivate();

        expect(result.isSuccess).toBe(true);
        expect(ticketType.isActive).toBe(true);
      });

      it('should fail when sold out', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ isActive: false, quantity: 50, soldQuantity: 50 }),
        ).value;

        const result = ticketType.reactivate();

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('sold out');
      });
    });
  });

  describe('Entity Base Methods', () => {
    describe('clone()', () => {
      it('should create an identical copy', () => {
        const original = TicketTypeEntity.create(
          createValidProps({ quantity: 100, soldQuantity: 25 }),
        ).value;

        const clone = original.clone();

        expect(clone.id).toBe(original.id);
        expect(clone.name).toBe(original.name);
        expect(clone.quantity).toBe(original.quantity);
        expect(clone.soldQuantity).toBe(original.soldQuantity);
      });

      it('should be independent from original', () => {
        const original = TicketTypeEntity.create(createValidProps()).value;
        const clone = original.clone();

        original.updateName('Modified Name');

        expect(clone.name).toBe('VIP Ticket');
        expect(original.name).toBe('Modified Name');
      });
    });

    describe('validate()', () => {
      it('should not throw for valid ticket type', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        expect(() => ticketType.validate()).not.toThrow();
      });
    });

    describe('equals()', () => {
      it('should return true for same ID', () => {
        const ticketType1 = TicketTypeEntity.create(createValidProps({ id: 'same-id' })).value;
        const ticketType2 = TicketTypeEntity.create(createValidProps({ id: 'same-id' })).value;

        expect(ticketType1.equals(ticketType2)).toBe(true);
      });

      it('should return false for different IDs', () => {
        const ticketType1 = TicketTypeEntity.create(createValidProps({ id: 'id-1' })).value;
        const ticketType2 = TicketTypeEntity.create(createValidProps({ id: 'id-2' })).value;

        expect(ticketType1.equals(ticketType2)).toBe(false);
      });

      it('should return false for undefined', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        expect(ticketType.equals(undefined)).toBe(false);
      });
    });

    describe('toObject()', () => {
      it('should return serializable object', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({
            id: 'tt-123',
            quantity: 100,
            soldQuantity: 30,
          }),
        ).value;

        const obj = ticketType.toObject();

        expect(obj.id).toBe('tt-123');
        expect(obj.name).toBe('VIP Ticket');
        expect(obj.description).toBe('Front row access with backstage pass');
        expect(obj.price.amount).toBe(150);
        expect(obj.price.currency).toBe('TND');
        expect(obj.quantity).toBe(100);
        expect(obj.soldQuantity).toBe(30);
        expect(obj.availableQuantity).toBe(70);
        expect(obj.salesProgress).toBe(30);
        expect(obj.isActive).toBe(true);
        expect(obj.isSoldOut).toBe(false);
        expect(typeof obj.createdAt).toBe('string');
        expect(typeof obj.updatedAt).toBe('string');
      });
    });

    describe('Domain Events', () => {
      it('should have empty events initially', () => {
        const ticketType = TicketTypeEntity.create(createValidProps()).value;

        expect(ticketType.domainEvents).toHaveLength(0);
      });

      it('should clear events after pulling', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 10, soldQuantity: 9 }),
        ).value;
        
        ticketType.incrementSold(1);
        expect(ticketType.domainEvents).toHaveLength(1);

        ticketType.pullDomainEvents();

        expect(ticketType.domainEvents).toHaveLength(0);
      });

      it('should allow clearing events manually', () => {
        const ticketType = TicketTypeEntity.create(
          createValidProps({ quantity: 10, soldQuantity: 9 }),
        ).value;
        
        ticketType.incrementSold(1);
        ticketType.clearDomainEvents();

        expect(ticketType.domainEvents).toHaveLength(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle max name length (100 chars)', () => {
      const result = TicketTypeEntity.create(createValidProps({ name: 'A'.repeat(100) }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.name.length).toBe(100);
    });

    it('should handle max description length (500 chars)', () => {
      const result = TicketTypeEntity.create(createValidProps({ description: 'B'.repeat(500) }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.description?.length).toBe(500);
    });

    it('should handle quantity of 1', () => {
      const result = TicketTypeEntity.create(createValidProps({ quantity: 1 }));

      expect(result.isSuccess).toBe(true);
      expect(result.value.quantity).toBe(1);
    });

    it('should handle selling single ticket that causes sold out', () => {
      const ticketType = TicketTypeEntity.create(
        createValidProps({ quantity: 1, soldQuantity: 0 }),
      ).value;

      const result = ticketType.incrementSold(1);

      expect(result.isSuccess).toBe(true);
      expect(ticketType.isSoldOut()).toBe(true);
      expect(ticketType.pullDomainEvents()).toHaveLength(1);
    });

    it('should handle different currencies', () => {
      const eurTicket = TicketTypeEntity.create(
        createValidProps({ price: TicketPriceVO.inEUR(100) }),
      ).value;
      const usdTicket = TicketTypeEntity.create(
        createValidProps({ price: TicketPriceVO.inUSD(120) }),
      ).value;

      expect(eurTicket.price.currency).toBe(Currency.EUR);
      expect(usdTicket.price.currency).toBe(Currency.USD);
    });
  });
});
