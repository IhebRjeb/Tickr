/**
 * @file Tickets E2E Test Helpers
 * @description In-memory repositories, mock adapters, and test data factories
 */

import type { CheckInRepositoryPort } from '@modules/tickets/application/ports/check-in.repository.port';
import type {
  EventQueryPort,
  EventInfo,
  TicketTypeAvailability,
} from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import type { UserQueryPort, UserInfo } from '@modules/tickets/application/ports/user-query.port';
import { CheckInEntity } from '@modules/tickets/domain/entities/check-in.entity';
import { TicketEntity } from '@modules/tickets/domain/entities/ticket.entity';
import { QRCodeVO } from '@modules/tickets/domain/value-objects/qr-code.vo';
import { TicketStatus } from '@modules/tickets/domain/value-objects/ticket-status.vo';


// ============================================
// Deterministic Test UUIDs
// ============================================

export const TEST_USER_IDS = {
  participant: '10000000-0000-4000-8000-000000000001',
  organizer: '10000000-0000-4000-8000-000000000002',
  otherUser: '10000000-0000-4000-8000-000000000003',
  admin: '10000000-0000-4000-8000-000000000004',
};

export const TEST_EVENT_IDS = {
  published: '20000000-0000-4000-8000-000000000001',
  unpublished: '20000000-0000-4000-8000-000000000002',
};

export const TEST_TICKET_TYPE_IDS = {
  vip: '30000000-0000-4000-8000-000000000001',
  standard: '30000000-0000-4000-8000-000000000002',
};

// ============================================
// In-Memory Ticket Repository
// ============================================

export class InMemoryTicketRepository implements TicketRepositoryPort {
  private tickets: Map<string, TicketEntity> = new Map();

  async findById(id: string): Promise<TicketEntity | null> {
    return this.tickets.get(id) ?? null;
  }

  async save(ticket: TicketEntity): Promise<TicketEntity> {
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  async saveAll(tickets: TicketEntity[]): Promise<TicketEntity[]> {
    for (const ticket of tickets) {
      this.tickets.set(ticket.id, ticket);
    }
    return tickets;
  }

  async delete(id: string): Promise<void> {
    this.tickets.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.tickets.has(id);
  }

  async findByQRCode(qrCode: string): Promise<TicketEntity | null> {
    for (const ticket of this.tickets.values()) {
      if (ticket.qrCode.value === qrCode) return ticket;
    }
    return null;
  }

  async findByOrderId(orderId: string): Promise<TicketEntity[]> {
    return [...this.tickets.values()].filter((t) => t.orderId === orderId);
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TicketEntity[]; total: number }> {
    const all = [...this.tickets.values()].filter((t) => t.userId === userId);
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length };
  }

  async findByEventId(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TicketEntity[]; total: number }> {
    const all = [...this.tickets.values()].filter(
      (t) => t.eventId === eventId,
    );
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length };
  }

  async findExpiredReservations(): Promise<TicketEntity[]> {
    const now = new Date();
    return [...this.tickets.values()].filter(
      (t) => t.status === TicketStatus.RESERVED && t.reservedUntil && t.reservedUntil < now,
    );
  }

  async countByEventId(eventId: string): Promise<number> {
    return [...this.tickets.values()].filter((t) => t.eventId === eventId)
      .length;
  }

  async countCheckedInByEventId(eventId: string): Promise<number> {
    return [...this.tickets.values()].filter(
      (t) => t.eventId === eventId && t.status === TicketStatus.CHECKED_IN,
    ).length;
  }

  // ============================================
  // Test Helpers
  // ============================================

  seedTicket(props: {
    id?: string;
    eventId?: string;
    ticketTypeId?: string;
    userId?: string;
    status?: TicketStatus;
    holderName?: string;
    holderEmail?: string;
    transferCount?: number;
    pdfUrl?: string | null;
    orderId?: string | null;
  }): TicketEntity {
    const ticket = TicketEntity.reconstitute({
      id: props.id ?? crypto.randomUUID(),
      eventId: props.eventId ?? TEST_EVENT_IDS.published,
      ticketTypeId: props.ticketTypeId ?? TEST_TICKET_TYPE_IDS.standard,
      orderId: props.orderId ?? null,
      userId: props.userId ?? TEST_USER_IDS.participant,
      qrCode: QRCodeVO.generate(),
      status: props.status ?? TicketStatus.CONFIRMED,
      priceAmount: 50,
      priceCurrency: 'TND',
      holderName: props.holderName ?? 'John Doe',
      holderEmail: props.holderEmail ?? 'john@example.com',
      holderPhone: null,
      checkedInAt: props.status === TicketStatus.CHECKED_IN ? new Date() : null,
      checkedInBy: props.status === TicketStatus.CHECKED_IN ? TEST_USER_IDS.organizer : null,
      transferredTo: null,
      transferredAt: null,
      transferCount: props.transferCount ?? 0,
      reservedUntil: props.status === TicketStatus.RESERVED
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null,
      pdfUrl: props.pdfUrl ?? (props.status === TicketStatus.CONFIRMED ? 'tickets/dev/test.pdf' : null),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  clear(): void {
    this.tickets.clear();
  }

  getAll(): TicketEntity[] {
    return [...this.tickets.values()];
  }
}

// ============================================
// In-Memory CheckIn Repository
// ============================================

export class InMemoryCheckInRepository implements CheckInRepositoryPort {
  private checkIns: Map<string, CheckInEntity> = new Map();

  async findById(id: string): Promise<CheckInEntity | null> {
    return this.checkIns.get(id) ?? null;
  }

  async save(checkIn: CheckInEntity): Promise<CheckInEntity> {
    this.checkIns.set(checkIn.id, checkIn);
    return checkIn;
  }

  async delete(id: string): Promise<void> {
    this.checkIns.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.checkIns.has(id);
  }

  async findByTicketId(ticketId: string): Promise<CheckInEntity[]> {
    return [...this.checkIns.values()].filter(
      (c) => c.ticketId === ticketId,
    );
  }

  async findByEventId(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<{ data: CheckInEntity[]; total: number }> {
    const all = [...this.checkIns.values()].filter(
      (c) => c.eventId === eventId,
    );
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length };
  }

  async countByEventId(eventId: string): Promise<number> {
    return [...this.checkIns.values()].filter((c) => c.eventId === eventId)
      .length;
  }

  clear(): void {
    this.checkIns.clear();
  }
}

// ============================================
// Mock Event Query Adapter
// ============================================

export class MockEventQueryAdapter implements EventQueryPort {
  private availabilityMap: Map<string, number> = new Map();

  constructor() {
    // Default: standard tickets have 100 available
    this.availabilityMap.set(TEST_TICKET_TYPE_IDS.standard, 100);
    this.availabilityMap.set(TEST_TICKET_TYPE_IDS.vip, 50);
  }

  async getEventById(eventId: string): Promise<EventInfo | null> {
    const overrides = this.eventOverrides.get(eventId);

    if (eventId === TEST_EVENT_IDS.published) {
      return {
        id: TEST_EVENT_IDS.published,
        status: 'PUBLISHED',
        startDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h from now
        endDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6h from now
        ...overrides,
      };
    }
    if (eventId === TEST_EVENT_IDS.unpublished) {
      return {
        id: TEST_EVENT_IDS.unpublished,
        status: 'DRAFT',
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 52 * 60 * 60 * 1000),
        ...overrides,
      };
    }
    return null;
  }

  async getTicketTypeAvailability(
    ticketTypeId: string,
  ): Promise<TicketTypeAvailability | null> {
    const available = this.availabilityMap.get(ticketTypeId);
    if (available === undefined) return null;
    return {
      available,
      price: ticketTypeId === TEST_TICKET_TYPE_IDS.vip ? 150 : 50,
      currency: 'TND',
      name: ticketTypeId === TEST_TICKET_TYPE_IDS.vip ? 'VIP' : 'Standard',
    };
  }

  async decrementTicketTypeAvailability(
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean> {
    const current = this.availabilityMap.get(ticketTypeId) ?? 0;
    if (current < quantity) return false;
    this.availabilityMap.set(ticketTypeId, current - quantity);
    return true;
  }

  async incrementTicketTypeAvailability(
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean> {
    const current = this.availabilityMap.get(ticketTypeId) ?? 0;
    this.availabilityMap.set(ticketTypeId, current + quantity);
    return true;
  }

  setAvailability(ticketTypeId: string, available: number): void {
    this.availabilityMap.set(ticketTypeId, available);
  }

  // Override event timing for check-in window tests
  private eventOverrides: Map<string, Partial<EventInfo>> = new Map();

  setEventOverride(eventId: string, overrides: Partial<EventInfo>): void {
    this.eventOverrides.set(eventId, overrides);
  }

  clear(): void {
    this.availabilityMap.set(TEST_TICKET_TYPE_IDS.standard, 100);
    this.availabilityMap.set(TEST_TICKET_TYPE_IDS.vip, 50);
    this.eventOverrides.clear();
  }
}

// ============================================
// Mock User Query Adapter
// ============================================

export class MockUserQueryAdapter implements UserQueryPort {
  private users: Map<string, UserInfo> = new Map();

  constructor() {
    this.users.set('john@example.com', {
      id: TEST_USER_IDS.participant,
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    this.users.set('other@example.com', {
      id: TEST_USER_IDS.otherUser,
      email: 'other@example.com',
      firstName: 'Other',
      lastName: 'User',
    });
  }

  async getUserByEmail(email: string): Promise<UserInfo | null> {
    return this.users.get(email.toLowerCase()) ?? null;
  }

  addUser(user: UserInfo): void {
    this.users.set(user.email.toLowerCase(), user);
  }

  clear(): void {
    // Re-seed default users
    this.users.clear();
    this.users.set('john@example.com', {
      id: TEST_USER_IDS.participant,
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    this.users.set('other@example.com', {
      id: TEST_USER_IDS.otherUser,
      email: 'other@example.com',
      firstName: 'Other',
      lastName: 'User',
    });
  }
}

// ============================================
// Mock Domain Event Publisher
// ============================================

export class MockDomainEventPublisher {
  private publishedEvents: unknown[] = [];

  publishAll(events: unknown[]): void {
    this.publishedEvents.push(...events);
  }

  publishFromAggregate(aggregate: { pullDomainEvents: () => unknown[] }): void {
    const events = aggregate.pullDomainEvents();
    this.publishedEvents.push(...events);
  }

  getPublishedEvents(): unknown[] {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

// ============================================
// Mock S3 Storage Service
// ============================================

export class MockTicketS3StorageService {
  async generateSignedUrl(key: string): Promise<string> {
    return `https://s3.example.com/${key}?signed=true`;
  }

  async uploadPdf(_key: string, _buffer: Buffer): Promise<string> {
    return 'tickets/dev/mock-uploaded.pdf';
  }
}

// ============================================
// JWT Token Generator
// ============================================

export function generateTestToken(
  jwtService: { sign: (payload: Record<string, unknown>) => string },
  payload: { userId: string; email: string; role: string },
): string {
  return jwtService.sign({
    sub: payload.userId,
    email: payload.email,
    role: payload.role,
  });
}

// ============================================
// Date Helpers
// ============================================

export function futureDate(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

export function pastDate(hoursAgo: number): Date {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}
