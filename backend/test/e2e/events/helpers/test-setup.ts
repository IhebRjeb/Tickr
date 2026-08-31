/**
 * Events E2E Test Setup Helpers
 *
 * Provides shared setup utilities for Events module E2E tests:
 * - InMemoryEventRepository (returns proper domain entities)
 * - Mock services (UserValidation, S3, DomainEvents)
 * - Test data factories
 */

import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { JwtService } from '@nestjs/jwt';

// ============================================
// Deterministic UUID Constants for Tests
// ============================================

/** User UUIDs */
export const TEST_ORGANIZER_ID = '10000000-0000-4000-a000-000000000001';
export const TEST_OTHER_ORGANIZER_ID = '10000000-0000-4000-a000-000000000002';
export const TEST_PARTICIPANT_ID = '20000000-0000-4000-a000-000000000001';
export const TEST_ADMIN_ID = '30000000-0000-4000-a000-000000000001';
export const TEST_NO_EVENTS_ORGANIZER_ID = '10000000-0000-4000-a000-000000000099';

/** Event UUIDs */
export const TEST_EVENT_IDS = {
  draft: 'e0000000-0000-4000-a000-000000000001',
  published: 'e0000000-0000-4000-a000-000000000002',
  cancelled: 'e0000000-0000-4000-a000-000000000003',
  draftOwn: 'e0000000-0000-4000-a000-000000000004',
  draftUpdate: 'e0000000-0000-4000-a000-000000000005',
  toPublish: 'e0000000-0000-4000-a000-000000000006',
  noTickets: 'e0000000-0000-4000-a000-000000000007',
  toCancel: 'e0000000-0000-4000-a000-000000000008',
  alreadyCancelled: 'e0000000-0000-4000-a000-000000000009',
  org1: 'e0000000-0000-4000-a000-000000000010',
  org2: 'e0000000-0000-4000-a000-000000000011',
  otherOrg: 'e0000000-0000-4000-a000-000000000012',
  alreadyPublished: 'e0000000-0000-4000-a000-000000000013',
  cancelledPublish: 'e0000000-0000-4000-a000-000000000014',
  cancelledUpdate: 'e0000000-0000-4000-a000-000000000015',
  draftCancel: 'e0000000-0000-4000-a000-000000000016',
  draftCancelOk: 'e0000000-0000-4000-a000-000000000017',
  pubUpdate: 'e0000000-0000-4000-a000-000000000018',
  withImage: 'e0000000-0000-4000-a000-000000000019',
  addTicket: 'e0000000-0000-4000-a000-000000000020',
  updateTicket: 'e0000000-0000-4000-a000-000000000021',
  removeTicket: 'e0000000-0000-4000-a000-000000000022',
  publishedSales: 'e0000000-0000-4000-a000-000000000023',
  // Query-specific
  concert1: 'e0000000-0000-4000-a000-000000000030',
  concert2: 'e0000000-0000-4000-a000-000000000031',
  conference1: 'e0000000-0000-4000-a000-000000000032',
  sport1: 'e0000000-0000-4000-a000-000000000033',
  draft1: 'e0000000-0000-4000-a000-000000000034',
  cancelled1: 'e0000000-0000-4000-a000-000000000035',
  pastEvent: 'e0000000-0000-4000-a000-000000000036',
};

/** Ticket Type UUIDs */
export const TEST_TICKET_IDS = {
  tkt1: 'f0000000-0000-4000-a000-000000000001',
  tktPub: 'f0000000-0000-4000-a000-000000000002',
  tktCancel: 'f0000000-0000-4000-a000-000000000003',
  tktPubUpd: 'f0000000-0000-4000-a000-000000000004',
  tktUpdate1: 'f0000000-0000-4000-a000-000000000005',
  tktRemove1: 'f0000000-0000-4000-a000-000000000006',
  tktWithSales: 'f0000000-0000-4000-a000-000000000007',
};
import { TicketTypeEntity } from '../../../../src/modules/events/domain/entities/ticket-type.entity';
import { Currency } from '../../../../src/modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '../../../../src/modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '../../../../src/modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '../../../../src/modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '../../../../src/modules/events/domain/value-objects/location.vo';
import { SalesPeriodVO } from '../../../../src/modules/events/domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '../../../../src/modules/events/domain/value-objects/ticket-price.vo';

// ============================================
// Types
// ============================================

export interface SeedEventData {
  id: string;
  organizerId?: string;
  title?: string;
  description?: string | null;
  category?: EventCategory;
  status?: EventStatus;
  startDate?: Date;
  endDate?: Date;
  location?: {
    address?: string;
    city: string;
    country: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  imageUrl?: string | null;
  ticketTypes?: SeedTicketTypeData[];
  totalCapacity?: number;
  soldTickets?: number;
  revenueAmount?: number;
  revenueCurrency?: Currency;
  publishedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SeedTicketTypeData {
  id: string;
  name: string;
  description?: string | null;
  priceAmount: number;
  priceCurrency: Currency;
  quantity: number;
  soldQuantity?: number;
  salesStartDate: Date;
  salesEndDate: Date;
  isActive?: boolean;
}

// ============================================
// Helper: Build Domain Entities from Seed Data
// ============================================

function buildTicketTypeEntity(data: SeedTicketTypeData, eventId: string): TicketTypeEntity {
  return TicketTypeEntity.reconstitute({
    id: data.id,
    eventId,
    name: data.name,
    description: data.description ?? null,
    price: TicketPriceVO.create(data.priceAmount, data.priceCurrency),
    quantity: data.quantity,
    soldQuantity: data.soldQuantity ?? 0,
    salesPeriod: SalesPeriodVO.create(data.salesStartDate, data.salesEndDate),
    isActive: data.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildEventEntity(data: SeedEventData): EventEntity {
  const loc = data.location || { city: 'Tunis', country: 'Tunisia' };
  const startDate = data.startDate || futureDate(48);
  const endDate = data.endDate || futureDate(52);

  const ticketTypeEntities = (data.ticketTypes || []).map(tt =>
    buildTicketTypeEntity(tt, data.id),
  );

  const totalCapacity = data.totalCapacity ??
    ticketTypeEntities.reduce((sum, tt) => sum + tt.quantity, 0);
  const soldTickets = data.soldTickets ??
    ticketTypeEntities.reduce((sum, tt) => sum + tt.soldQuantity, 0);

  return EventEntity.reconstitute({
    id: data.id,
    organizerId: data.organizerId || TEST_ORGANIZER_ID,
    title: data.title || 'Test Event',
    description: data.description !== undefined ? data.description : 'Test description',
    category: data.category || EventCategory.CONCERT,
    location: LocationVO.create({
      address: loc.address,
      city: loc.city,
      country: loc.country,
      postalCode: loc.postalCode,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }),
    dateRange: startDate < new Date()
      ? EventDateRangeVO.createFromExisting(startDate, endDate)
      : EventDateRangeVO.create(startDate, endDate),
    imageUrl: data.imageUrl ?? null,
    status: data.status || EventStatus.DRAFT,
    ticketTypes: ticketTypeEntities,
    totalCapacity,
    soldTickets,
    revenueAmount: data.revenueAmount ?? 0,
    revenueCurrency: data.revenueCurrency ?? Currency.TND,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    publishedAt: data.publishedAt ?? null,
    cancelledAt: data.cancelledAt ?? null,
    cancellationReason: data.cancellationReason ?? null,
  });
}

// ============================================
// In-Memory Event Repository
// ============================================

export class InMemoryEventRepository {
  private events: Map<string, EventEntity> = new Map();

  async findById(id: string): Promise<EventEntity | null> {
    return this.events.get(id) || null;
  }

  async findPublished(filters: any = {}, options: any = {}) {
    let filtered = Array.from(this.events.values()).filter(
      (e) => e.status === EventStatus.PUBLISHED,
    );

    if (filters.category) {
      filtered = filtered.filter((e) => e.category === filters.category);
    }
    if (filters.city) {
      filtered = filtered.filter(
        (e) => e.location.city.toLowerCase() === filters.city.toLowerCase(),
      );
    }
    if (filters.country) {
      filtered = filtered.filter(
        (e) => e.location.country.toLowerCase() === filters.country.toLowerCase(),
      );
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const total = filtered.length;

    return {
      data: filtered.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: start + limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async findByCategory(category: string, options: any = {}) {
    const filtered = Array.from(this.events.values()).filter(
      (e) => e.category === category && e.status === EventStatus.PUBLISHED,
    );

    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const total = filtered.length;

    return {
      data: filtered.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: start + limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async findByOrganizer(organizerId: string, options: any = {}) {
    let filtered = Array.from(this.events.values()).filter(
      (e) => e.organizerId === organizerId,
    );

    if (options.status) {
      filtered = filtered.filter((e) => e.status === options.status);
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const total = filtered.length;

    return {
      data: filtered.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: start + limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async findByOrganizerId(organizerId: string, options: any = {}) {
    return this.findByOrganizer(organizerId, options);
  }

  async findUpcoming(options: any = {}) {
    const now = new Date();
    let filtered = Array.from(this.events.values()).filter(
      (e) => e.status === EventStatus.PUBLISHED && e.dateRange.startDate > now,
    );

    if (options.city) {
      filtered = filtered.filter(
        (e) => e.location.city.toLowerCase() === options.city.toLowerCase(),
      );
    }
    if (options.country) {
      filtered = filtered.filter(
        (e) => e.location.country.toLowerCase() === options.country.toLowerCase(),
      );
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const total = filtered.length;

    return {
      data: filtered.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: start + limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async searchByTitle(searchTerm: string, options: any = {}) {
    const filtered = Array.from(this.events.values()).filter(
      (e) =>
        e.status === EventStatus.PUBLISHED &&
        e.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const total = filtered.length;

    return {
      data: filtered.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: start + limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async save(event: EventEntity): Promise<EventEntity> {
    this.events.set(event.id, event);
    return event;
  }

  async delete(id: string): Promise<void> {
    this.events.delete(id);
  }

  async existsById(id: string): Promise<boolean> {
    return this.events.has(id);
  }

  async countByOrganizer(organizerId: string): Promise<number> {
    return Array.from(this.events.values()).filter(
      (e) => e.organizerId === organizerId,
    ).length;
  }

  clear(): void {
    this.events.clear();
  }

  /**
   * Seed an event entity from simple data.
   * Converts plain data to proper domain entities with VOs.
   */
  async seedEvent(data: SeedEventData): Promise<EventEntity> {
    const entity = buildEventEntity(data);
    this.events.set(entity.id, entity);
    return entity;
  }

  getAllEvents(): EventEntity[] {
    return Array.from(this.events.values());
  }
}

// ============================================
// Mock Domain Event Publisher
// ============================================

export class MockDomainEventPublisher {
  private publishedEvents: any[] = [];

  async publishAll(events: any[]) {
    this.publishedEvents.push(...events);
  }

  async publishFromAggregate(aggregate: { pullDomainEvents(): any[] }) {
    const events = aggregate.pullDomainEvents();
    this.publishedEvents.push(...events);
  }

  getPublishedEvents() {
    return this.publishedEvents;
  }

  clear() {
    this.publishedEvents = [];
  }
}

// ============================================
// Mock User Validation Service
// ============================================

export const createMockUserValidationService = () => ({
  validateOrganizer: jest.fn().mockResolvedValue({
    exists: true,
    isActive: true,
    isOrganizer: true,
    firstName: 'Test',
    lastName: 'Organizer',
  }),
  userExists: jest.fn().mockResolvedValue(true),
  isEventOwner: jest.fn().mockImplementation(
    (userId: string, organizerId: string) => userId === organizerId,
  ),
  hasRole: jest.fn().mockResolvedValue(true),
  isAdmin: jest.fn().mockResolvedValue(false),
});

// ============================================
// Mock S3 Storage Service
// ============================================

export const createMockS3Service = () => ({
  uploadImage: jest.fn().mockResolvedValue('https://cdn.example.com/events/test-image.jpg'),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  generateThumbnail: jest.fn().mockResolvedValue('https://cdn.example.com/events/test-thumb.jpg'),
});

// ============================================
// Test Data Factories
// ============================================

export const futureDate = (hoursFromNow: number): Date => {
  const date = new Date();
  date.setTime(date.getTime() + hoursFromNow * 60 * 60 * 1000);
  return date;
};

export const createTestEventDto = (overrides: Record<string, any> = {}) => ({
  title: 'Test Concert Event',
  description: 'An amazing test concert',
  category: 'CONCERT',
  startDate: futureDate(48).toISOString(),
  endDate: futureDate(52).toISOString(),
  location: {
    city: 'Tunis',
    country: 'Tunisia',
    address: '123 Test Street',
    postalCode: '1000',
  },
  ...overrides,
});

export const createTestTicketTypeDto = (overrides: Record<string, any> = {}) => ({
  name: 'General Admission',
  description: 'Standard entry ticket',
  price: 50,
  currency: 'TND',
  quantity: 100,
  salesStartDate: futureDate(2).toISOString(),
  salesEndDate: futureDate(46).toISOString(),
  ...overrides,
});

// ============================================
// Token Generator
// ============================================

export const generateTestToken = (
  jwtService: JwtService,
  payload: { sub: string; email: string; role: string },
) => {
  return jwtService.sign({
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    type: 'access',
  });
};
