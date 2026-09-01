/**
 * @file EventMapper Unit Tests
 * @description Tests for EventMapper conversion methods
 */

import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { EventOrmEntity } from '@modules/events/infrastructure/persistence/entities/event.orm-entity';
import { TicketTypeOrmEntity } from '@modules/events/infrastructure/persistence/entities/ticket-type.orm-entity';
import { EventMapper } from '@modules/events/infrastructure/persistence/mappers/event.mapper';
import { TicketTypeMapper } from '@modules/events/infrastructure/persistence/mappers/ticket-type.mapper';

describe('EventMapper', () => {
  let mapper: EventMapper;
  let ticketTypeMapper: TicketTypeMapper;

  // Valid UUIDs for testing
  const testEventId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const testOrganizerId = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';
  const testTicketTypeId = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

  beforeEach(() => {
    ticketTypeMapper = new TicketTypeMapper();
    mapper = new EventMapper(ticketTypeMapper);
  });

  // Helper to create a test ORM entity
  const createOrmEntity = (overrides: Partial<EventOrmEntity> = {}): EventOrmEntity => {
    const entity = new EventOrmEntity();
    entity.id = testEventId;
    entity.organizerId = testOrganizerId;
    entity.title = 'Summer Concert';
    entity.description = 'A great music event';
    entity.category = EventCategory.CONCERT;
    entity.status = EventStatus.PUBLISHED;
    entity.imageUrl = 'https://example.com/image.jpg';
    entity.commissionRateOverride = null;
    entity.locationAddress = '123 Main Street';
    entity.locationCity = 'Tunis';
    entity.locationCountry = 'Tunisia';
    entity.locationPostalCode = '1000';
    entity.locationLat = 36.8065;
    entity.locationLng = 10.1815;
    entity.startDate = new Date('2026-07-15T18:00:00Z');
    entity.endDate = new Date('2026-07-15T23:00:00Z');
    entity.isMultiDay = false;
    entity.totalCapacity = 500;
    entity.soldTickets = 150;
    entity.revenueAmount = 7500;
    entity.revenueCurrency = Currency.TND;
    entity.createdAt = new Date('2026-05-01T10:00:00Z');
    entity.updatedAt = new Date('2026-06-01T15:30:00Z');
    entity.publishedAt = new Date('2026-05-15T12:00:00Z');
    entity.cancelledAt = null;
    entity.cancellationReason = null;
    entity.ticketTypes = [];
    return Object.assign(entity, overrides);
  };

  // Helper to create a test ticket type ORM entity
  const createTicketTypeOrmEntity = (eventId: string): TicketTypeOrmEntity => {
    const entity = new TicketTypeOrmEntity();
    entity.id = testTicketTypeId;
    entity.eventId = eventId;
    entity.name = 'General Admission';
    entity.description = 'Standard entry';
    entity.priceAmount = 50;
    entity.priceCurrency = Currency.TND;
    entity.quantity = 500;
    entity.soldQuantity = 150;
    entity.salesStart = new Date('2026-06-01T00:00:00Z');
    entity.salesEnd = new Date('2026-07-14T23:59:59Z');
    entity.isActive = true;
    entity.createdAt = new Date('2026-05-01T10:00:00Z');
    entity.updatedAt = new Date('2026-05-01T10:00:00Z');
    return entity;
  };

  // Helper to create a domain event entity
  const createDomainEvent = (): EventEntity => {
    const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    const salesStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const salesEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const location = LocationVO.create({
      address: '456 Avenue',
      city: 'Sousse',
      country: 'Tunisia',
      postalCode: '4000',
      latitude: 35.8288,
      longitude: 10.5915,
    });

    const dateRange = EventDateRangeVO.create(
      startDate,
      endDate,
      true,
    );

    const result = EventEntity.create({
      organizerId: testOrganizerId,
      title: 'Jazz Festival',
      description: 'Three days of jazz music',
      category: EventCategory.FESTIVAL,
      location,
      dateRange,
    });

    if (!result.isSuccess) {
      throw new Error(`Failed to create test event: ${result.error?.message}`);
    }

    const event = result.value;

    // Add a ticket type
    const ticketTypeResult = TicketTypeEntity.create({
      eventId: event.id,
      name: 'Festival Pass',
      price: TicketPriceVO.create(200, Currency.TND),
      quantity: 1000,
      salesPeriod: SalesPeriodVO.create(
        salesStart,
        salesEnd,
      ),
    });

    if (!ticketTypeResult.isSuccess) {
      throw new Error(`Failed to create test ticket type: ${ticketTypeResult.error?.message}`);
    }

    event.addTicketType(ticketTypeResult.value);

    return event;
  };

  describe('toDomain', () => {
    it('should convert ORM entity to domain entity', () => {
      const ormEntity = createOrmEntity();

      const domain = mapper.toDomain(ormEntity);

      expect(domain.id).toBe(ormEntity.id);
      expect(domain.organizerId).toBe(ormEntity.organizerId);
      expect(domain.title).toBe(ormEntity.title);
      expect(domain.description).toBe(ormEntity.description);
      expect(domain.category).toBe(ormEntity.category);
      expect(domain.status).toBe(ormEntity.status);
      expect(domain.imageUrl).toBe(ormEntity.imageUrl);
    });

    it('should map an event commission override', () => {
      const ormEntity = createOrmEntity({ commissionRateOverride: 0.03 });

      const domain = mapper.toDomain(ormEntity);

      expect(domain.commissionRateOverride).toBe(0.03);
      expect(mapper.toPersistence(domain).commissionRateOverride).toBe(0.03);
    });

    it('should convert location fields to LocationVO', () => {
      const ormEntity = createOrmEntity();

      const domain = mapper.toDomain(ormEntity);

      expect(domain.location.address).toBe(ormEntity.locationAddress);
      expect(domain.location.city).toBe(ormEntity.locationCity);
      expect(domain.location.country).toBe(ormEntity.locationCountry);
      expect(domain.location.postalCode).toBe(ormEntity.locationPostalCode);
      expect(domain.location.latitude).toBe(ormEntity.locationLat);
      expect(domain.location.longitude).toBe(ormEntity.locationLng);
    });

    it('should convert date fields to EventDateRangeVO', () => {
      const ormEntity = createOrmEntity();

      const domain = mapper.toDomain(ormEntity);

      expect(domain.dateRange.startDate).toEqual(ormEntity.startDate);
      expect(domain.dateRange.endDate).toEqual(ormEntity.endDate);
      // isMultiDay is computed from the dates, not stored directly
      // It checks if start and end dates are on different calendar days
      expect(typeof domain.dateRange.isMultiDay).toBe('boolean');
    });

    it('should convert capacity and revenue fields', () => {
      const ormEntity = createOrmEntity();

      const domain = mapper.toDomain(ormEntity);

      expect(domain.totalCapacity).toBe(ormEntity.totalCapacity);
      expect(domain.soldTickets).toBe(ormEntity.soldTickets);
    });

    it('should convert ticket types when loaded', () => {
      const ormEntity = createOrmEntity();
      ormEntity.ticketTypes = [createTicketTypeOrmEntity(ormEntity.id)];

      const domain = mapper.toDomain(ormEntity);

      expect(domain.ticketTypes).toHaveLength(1);
      expect(domain.ticketTypes[0].name).toBe('General Admission');
    });

    it('should handle null optional fields', () => {
      const ormEntity = createOrmEntity({
        description: null,
        imageUrl: null,
        locationAddress: null,
        locationPostalCode: null,
        locationLat: null,
        locationLng: null,
        publishedAt: null,
      });

      const domain = mapper.toDomain(ormEntity);

      expect(domain.description).toBeNull();
      expect(domain.imageUrl).toBeNull();
      expect(domain.location.address).toBeNull();
    });

    it('should convert decimal strings to numbers', () => {
      const ormEntity = createOrmEntity();
      // TypeORM may return decimals as strings
      (ormEntity as any).locationLat = '36.8065';
      (ormEntity as any).locationLng = '10.1815';
      (ormEntity as any).revenueAmount = '7500.500';

      const domain = mapper.toDomain(ormEntity);

      expect(typeof domain.location.latitude).toBe('number');
      expect(domain.location.latitude).toBe(36.8065);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to ORM entity', () => {
      const domain = createDomainEvent();

      const ormEntity = mapper.toPersistence(domain);

      expect(ormEntity.id).toBe(domain.id);
      expect(ormEntity.organizerId).toBe(domain.organizerId);
      expect(ormEntity.title).toBe(domain.title);
      expect(ormEntity.description).toBe(domain.description);
      expect(ormEntity.category).toBe(domain.category);
      expect(ormEntity.status).toBe(domain.status);
    });

    it('should convert LocationVO to flat columns', () => {
      const domain = createDomainEvent();

      const ormEntity = mapper.toPersistence(domain);

      expect(ormEntity.locationCity).toBe(domain.location.city);
      expect(ormEntity.locationCountry).toBe(domain.location.country);
      expect(ormEntity.locationAddress).toBe(domain.location.address);
    });

    it('should convert EventDateRangeVO to flat columns', () => {
      const domain = createDomainEvent();

      const ormEntity = mapper.toPersistence(domain);

      expect(ormEntity.startDate).toEqual(domain.dateRange.startDate);
      expect(ormEntity.endDate).toEqual(domain.dateRange.endDate);
      expect(ormEntity.isMultiDay).toBe(domain.dateRange.isMultiDay);
    });

    it('should convert ticket types', () => {
      const domain = createDomainEvent();

      const ormEntity = mapper.toPersistence(domain);

      expect(ormEntity.ticketTypes).toHaveLength(1);
      expect(ormEntity.ticketTypes[0].name).toBe('Festival Pass');
    });
  });

  describe('toDomainWithoutTicketTypes', () => {
    it('should convert without loading ticket types', () => {
      const ormEntity = createOrmEntity();
      ormEntity.ticketTypes = [createTicketTypeOrmEntity(ormEntity.id)];

      const domain = mapper.toDomainWithoutTicketTypes(ormEntity);

      // Should have empty ticket types even though ORM has them
      expect(domain.ticketTypes).toHaveLength(0);
      expect(domain.title).toBe(ormEntity.title);
    });
  });

  describe('updatePersistence', () => {
    it('should update existing ORM entity with domain data', () => {
      const existingOrm = createOrmEntity();
      const domain = createDomainEvent();

      const updated = mapper.updatePersistence(existingOrm, domain);

      // Should be the same instance
      expect(updated).toBe(existingOrm);
      
      // Should have updated values
      expect(updated.title).toBe(domain.title);
      expect(updated.description).toBe(domain.description);
      expect(updated.locationCity).toBe(domain.location.city);
    });

    it('should preserve id from target entity', () => {
      const existingOrm = createOrmEntity({ id: 'original-id' });
      const domain = createDomainEvent();

      const updated = mapper.updatePersistence(existingOrm, domain);

      // ID should NOT be updated (preserves original)
      expect(updated.id).toBe('original-id');
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of ORM entities', () => {
      const ormEntities = [
        createOrmEntity({ id: 'evt-1', title: 'Event 1' }),
        createOrmEntity({ id: 'evt-2', title: 'Event 2' }),
      ];

      const domains = mapper.toDomainArray(ormEntities);

      expect(domains).toHaveLength(2);
      expect(domains[0].id).toBe('evt-1');
      expect(domains[1].id).toBe('evt-2');
    });

    it('should return empty array for empty input', () => {
      const domains = mapper.toDomainArray([]);

      expect(domains).toHaveLength(0);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve core data through domain -> persistence -> domain', () => {
      const originalDomain = createDomainEvent();

      const persistence = mapper.toPersistence(originalDomain);
      const restoredDomain = mapper.toDomain(persistence);

      expect(restoredDomain.id).toBe(originalDomain.id);
      expect(restoredDomain.organizerId).toBe(originalDomain.organizerId);
      expect(restoredDomain.title).toBe(originalDomain.title);
      expect(restoredDomain.category).toBe(originalDomain.category);
      expect(restoredDomain.location.city).toBe(originalDomain.location.city);
      expect(restoredDomain.dateRange.startDate).toEqual(originalDomain.dateRange.startDate);
    });
  });
});
