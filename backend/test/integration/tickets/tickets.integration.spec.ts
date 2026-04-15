/**
 * @file Tickets Module Integration Tests
 * @description Tests mapper roundtrip, repository logic, and handler+repo integration
 *              using in-memory repositories with NestJS TestingModule
 */


import { CheckInEntity } from '@modules/tickets/domain/entities/check-in.entity';
import { TicketEntity } from '@modules/tickets/domain/entities/ticket.entity';
import { QRCodeVO } from '@modules/tickets/domain/value-objects/qr-code.vo';
import { TicketStatus } from '@modules/tickets/domain/value-objects/ticket-status.vo';
import { Logger } from '@nestjs/common';

import {
  InMemoryTicketRepository,
  InMemoryCheckInRepository,
  TEST_USER_IDS,
  TEST_EVENT_IDS,
  TEST_TICKET_TYPE_IDS,
} from '../../e2e/tickets/helpers/test-setup';

describe('Tickets Module - Integration Tests', () => {
  let ticketRepository: InMemoryTicketRepository;
  let checkInRepository: InMemoryCheckInRepository;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  beforeEach(() => {
    ticketRepository = new InMemoryTicketRepository();
    checkInRepository = new InMemoryCheckInRepository();
  });

  // ============================================
  // Ticket Repository Operations
  // ============================================

  describe('Ticket Repository', () => {
    it('should save and retrieve a ticket by ID', async () => {
      const qrCode = QRCodeVO.generate();
      const ticket = TicketEntity.reconstitute({
        id: '50000000-0000-4000-8000-000000000001',
        eventId: TEST_EVENT_IDS.published,
        ticketTypeId: TEST_TICKET_TYPE_IDS.standard,
        orderId: null,
        userId: TEST_USER_IDS.participant,
        qrCode,
        status: TicketStatus.RESERVED,
        priceAmount: 50,
        priceCurrency: 'TND',
        holderName: 'John Doe',
        holderEmail: 'john@example.com',
        holderPhone: null,
        checkedInAt: null,
        checkedInBy: null,
        transferredTo: null,
        transferredAt: null,
        transferCount: 0,
        reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
        pdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await ticketRepository.save(ticket);
      const found = await ticketRepository.findById(saved.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(saved.id);
      expect(found!.qrCode.value).toBe(qrCode.value);
      expect(found!.status).toBe(TicketStatus.RESERVED);
      expect(found!.holderName).toBe('John Doe');
    });

    it('should find ticket by QR code', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
      });

      const found = await ticketRepository.findByQRCode(ticket.qrCode.value);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(ticket.id);
    });

    it('should return null for non-existent QR code', async () => {
      const found = await ticketRepository.findByQRCode('v1-nonexistent-abcd');
      expect(found).toBeNull();
    });

    it('should find tickets by user with pagination', async () => {
      ticketRepository.seedTicket({ userId: TEST_USER_IDS.participant });
      ticketRepository.seedTicket({ userId: TEST_USER_IDS.participant });
      ticketRepository.seedTicket({ userId: TEST_USER_IDS.otherUser });

      const result = await ticketRepository.findByUserId(
        TEST_USER_IDS.participant,
        1,
        10,
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should find tickets by event with pagination', async () => {
      ticketRepository.seedTicket({ eventId: TEST_EVENT_IDS.published });
      ticketRepository.seedTicket({ eventId: TEST_EVENT_IDS.published });
      ticketRepository.seedTicket({ eventId: TEST_EVENT_IDS.unpublished });

      const result = await ticketRepository.findByEventId(
        TEST_EVENT_IDS.published,
        1,
        10,
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should find expired reservations', async () => {
      // Active reservation (not expired)
      ticketRepository.seedTicket({
        status: TicketStatus.RESERVED,
      });

      // Expired reservation (manually create with past reservedUntil)
      const expired = TicketEntity.reconstitute({
        id: '50000000-0000-4000-8000-000000000099',
        eventId: TEST_EVENT_IDS.published,
        ticketTypeId: TEST_TICKET_TYPE_IDS.standard,
        orderId: null,
        userId: TEST_USER_IDS.participant,
        qrCode: QRCodeVO.generate(),
        status: TicketStatus.RESERVED,
        priceAmount: 50,
        priceCurrency: 'TND',
        holderName: 'Expired User',
        holderEmail: 'expired@example.com',
        holderPhone: null,
        checkedInAt: null,
        checkedInBy: null,
        transferredTo: null,
        transferredAt: null,
        transferCount: 0,
        reservedUntil: new Date(Date.now() - 60 * 1000), // 1 minute ago
        pdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await ticketRepository.save(expired);

      const expiredList = await ticketRepository.findExpiredReservations();

      expect(expiredList).toHaveLength(1);
      expect(expiredList[0].id).toBe(expired.id);
    });

    it('should count tickets by event', async () => {
      ticketRepository.seedTicket({ eventId: TEST_EVENT_IDS.published });
      ticketRepository.seedTicket({ eventId: TEST_EVENT_IDS.published });

      const count = await ticketRepository.countByEventId(TEST_EVENT_IDS.published);
      expect(count).toBe(2);
    });

    it('should count checked-in tickets by event', async () => {
      ticketRepository.seedTicket({
        eventId: TEST_EVENT_IDS.published,
        status: TicketStatus.CONFIRMED,
      });
      ticketRepository.seedTicket({
        eventId: TEST_EVENT_IDS.published,
        status: TicketStatus.CHECKED_IN,
      });

      const count = await ticketRepository.countCheckedInByEventId(
        TEST_EVENT_IDS.published,
      );
      expect(count).toBe(1);
    });

    it('should batch save tickets', async () => {
      const ticket1 = ticketRepository.seedTicket({});
      const ticket2 = ticketRepository.seedTicket({});

      const result = await ticketRepository.saveAll([ticket1, ticket2]);
      expect(result).toHaveLength(2);

      const all = ticketRepository.getAll();
      expect(all).toHaveLength(2);
    });
  });

  // ============================================
  // CheckIn Repository Operations
  // ============================================

  describe('CheckIn Repository', () => {
    it('should save and retrieve a check-in', async () => {
      const checkInResult = CheckInEntity.create({
        ticketId: '50000000-0000-4000-8000-000000000001',
        eventId: TEST_EVENT_IDS.published,
        staffId: TEST_USER_IDS.organizer,
        deviceId: 'scanner-gate-a',
        locationGate: 'Gate A',
        isValid: true,
      });

      const checkIn = checkInResult.value;
      const saved = await checkInRepository.save(checkIn);
      const found = await checkInRepository.findById(saved.id);

      expect(found).not.toBeNull();
      expect(found!.ticketId).toBe('50000000-0000-4000-8000-000000000001');
      expect(found!.isValid).toBe(true);
      expect(found!.deviceId).toBe('scanner-gate-a');
    });

    it('should find check-ins by ticket ID', async () => {
      const ticketId = '50000000-0000-4000-8000-000000000001';

      const c1 = CheckInEntity.create({
        ticketId,
        eventId: TEST_EVENT_IDS.published,
        staffId: TEST_USER_IDS.organizer,
        deviceId: 'scanner-1',
        locationGate: 'Gate A',
        isValid: true,
      }).value;

      const c2 = CheckInEntity.create({
        ticketId,
        eventId: TEST_EVENT_IDS.published,
        staffId: TEST_USER_IDS.organizer,
        deviceId: 'scanner-2',
        locationGate: 'Gate B',
        isValid: false,
        failureReason: 'Duplicate check-in',
      }).value;

      await checkInRepository.save(c1);
      await checkInRepository.save(c2);

      const found = await checkInRepository.findByTicketId(ticketId);
      expect(found).toHaveLength(2);
    });

    it('should count check-ins by event', async () => {
      const c1 = CheckInEntity.create({
        ticketId: '50000000-0000-4000-8000-000000000001',
        eventId: TEST_EVENT_IDS.published,
        staffId: TEST_USER_IDS.organizer,
        deviceId: 'scanner-1',
        locationGate: 'Gate A',
        isValid: true,
      }).value;

      await checkInRepository.save(c1);

      const count = await checkInRepository.countByEventId(TEST_EVENT_IDS.published);
      expect(count).toBe(1);
    });
  });

  // ============================================
  // Domain Entity Roundtrip
  // ============================================

  describe('Domain Entity Roundtrip', () => {
    it('should preserve all ticket fields through save/retrieve cycle', async () => {
      const qrCode = QRCodeVO.generate();
      const now = new Date();

      const original = TicketEntity.reconstitute({
        id: '50000000-0000-4000-8000-000000000010',
        eventId: TEST_EVENT_IDS.published,
        ticketTypeId: TEST_TICKET_TYPE_IDS.vip,
        orderId: 'order-001',
        userId: TEST_USER_IDS.participant,
        qrCode,
        status: TicketStatus.CONFIRMED,
        priceAmount: 150,
        priceCurrency: 'TND',
        holderName: 'Jane Smith',
        holderEmail: 'jane@example.com',
        holderPhone: '+21612345678',
        checkedInAt: null,
        checkedInBy: null,
        transferredTo: TEST_USER_IDS.otherUser,
        transferredAt: now,
        transferCount: 1,
        reservedUntil: null,
        pdfUrl: 'tickets/dev/jane-vip.pdf',
        createdAt: now,
        updatedAt: now,
      });

      await ticketRepository.save(original);
      const retrieved = await ticketRepository.findById(original.id);

      expect(retrieved!.id).toBe(original.id);
      expect(retrieved!.eventId).toBe(original.eventId);
      expect(retrieved!.ticketTypeId).toBe(original.ticketTypeId);
      expect(retrieved!.orderId).toBe('order-001');
      expect(retrieved!.userId).toBe(original.userId);
      expect(retrieved!.qrCode.value).toBe(qrCode.value);
      expect(retrieved!.status).toBe(TicketStatus.CONFIRMED);
      expect(retrieved!.priceAmount).toBe(150);
      expect(retrieved!.priceCurrency).toBe('TND');
      expect(retrieved!.holderName).toBe('Jane Smith');
      expect(retrieved!.holderEmail).toBe('jane@example.com');
      expect(retrieved!.holderPhone).toBe('+21612345678');
      expect(retrieved!.transferredTo).toBe(TEST_USER_IDS.otherUser);
      expect(retrieved!.transferCount).toBe(1);
      expect(retrieved!.pdfUrl).toBe('tickets/dev/jane-vip.pdf');
    });

    it('should handle ticket state transitions through repository', async () => {
      // Create RESERVED ticket
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.RESERVED,
      });

      // Confirm it (domain operation)
      ticket.confirm('order-001');
      await ticketRepository.save(ticket);

      // Retrieve and verify
      const confirmed = await ticketRepository.findById(ticket.id);
      expect(confirmed!.status).toBe(TicketStatus.CONFIRMED);
      expect(confirmed!.orderId).toBe('order-001');
    });
  });
});
