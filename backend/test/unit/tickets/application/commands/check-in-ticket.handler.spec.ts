/**
 * @file CheckInTicketHandler Unit Tests
 */

import { CheckInTicketCommand } from '@modules/tickets/application/commands/check-in-ticket/check-in-ticket.command';
import { CheckInTicketHandler } from '@modules/tickets/application/commands/check-in-ticket/check-in-ticket.handler';
import type { CheckInRepositoryPort } from '@modules/tickets/application/ports/check-in.repository.port';
import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('CheckInTicketHandler', () => {
  let handler: CheckInTicketHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockCheckInRepository: jest.Mocked<CheckInRepositoryPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validStaffId = '550e8400-e29b-41d4-a716-446655440004';
  const validEventId = '550e8400-e29b-41d4-a716-446655440001';

  // Event window: starts in 30 minutes, ends in 5 hours
  const eventStartDate = new Date(Date.now() + 30 * 60 * 1000);
  const eventEndDate = new Date(Date.now() + 5 * 60 * 60 * 1000);

  const createConfirmedTicket = (): TicketEntity => {
    const qrCode = QRCodeVO.generate();
    return TicketEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440010',
      eventId: validEventId,
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: 'order-123',
      userId: '550e8400-e29b-41d4-a716-446655440003',
      qrCode,
      status: TicketStatus.CONFIRMED,
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
      reservedUntil: null,
      pdfUrl: 'tickets/dev/abc.pdf',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const createCheckedInTicket = (): TicketEntity => {
    return TicketEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440010',
      eventId: validEventId,
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: 'order-123',
      userId: '550e8400-e29b-41d4-a716-446655440003',
      qrCode: QRCodeVO.generate(),
      status: TicketStatus.CHECKED_IN,
      priceAmount: 50,
      priceCurrency: 'TND',
      holderName: 'John Doe',
      holderEmail: 'john@example.com',
      holderPhone: null,
      checkedInAt: new Date(Date.now() - 60 * 1000),
      checkedInBy: validStaffId,
      transferredTo: null,
      transferredAt: null,
      transferCount: 0,
      reservedUntil: null,
      pdfUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockTicketRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByQRCode: jest.fn(),
    } as any;

    mockCheckInRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTicketId: jest.fn(),
      findByEventId: jest.fn(),
      countByEventId: jest.fn(),
    } as any;

    mockEventQuery = {
      getEventById: jest.fn(),
      getTicketTypeAvailability: jest.fn(),
      decrementTicketTypeAvailability: jest.fn(),
      incrementTicketTypeAvailability: jest.fn(),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new CheckInTicketHandler(
      mockTicketRepository,
      mockCheckInRepository,
      mockEventQuery,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('Success', () => {
    it('should check in a confirmed ticket within event window', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: eventStartDate,
        endDate: eventEndDate,
      });

      const command = new CheckInTicketCommand(
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.holderName).toBe('John Doe');
      expect(ticket.status).toBe(TicketStatus.CHECKED_IN);
    });

    it('should create check-in audit record', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: eventStartDate,
        endDate: eventEndDate,
      });

      const command = new CheckInTicketCommand(
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      await handler.execute(command);

      expect(mockCheckInRepository.save).toHaveBeenCalled();
    });

    it('should publish domain events', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: eventStartDate,
        endDate: eventEndDate,
      });

      const command = new CheckInTicketCommand(
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalled();
    });
  });

  describe('QR Code Validation', () => {
    it('should fail with invalid QR code format', async () => {
      const command = new CheckInTicketCommand(
        'invalid-qr-code',
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_QR_CODE');
    });
  });

  describe('Ticket Not Found', () => {
    it('should fail when no ticket matches QR code', async () => {
      const validQr = QRCodeVO.generate().value;
      mockTicketRepository.findByQRCode.mockResolvedValue(null);

      const command = new CheckInTicketCommand(
        validQr,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKET_NOT_FOUND');
    });
  });

  describe('Time Window Validation', () => {
    it('should fail when check-in is too early (before window opens)', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);

      // Event starts in 3 hours → window opens in 2 hours → too early
      const futureStart = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 8 * 60 * 60 * 1000);

      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: futureStart,
        endDate: futureEnd,
      });

      const command = new CheckInTicketCommand(
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CHECK_IN_OUTSIDE_WINDOW');
    });

    it('should fail when event has already ended', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);

      const pastStart = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000);

      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: pastStart,
        endDate: pastEnd,
      });

      const command = new CheckInTicketCommand(
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CHECK_IN_OUTSIDE_WINDOW');
    });

    it('should fail when event not found', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      mockEventQuery.getEventById.mockResolvedValue(null);

      const command = new CheckInTicketCommand(
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
    });
  });

  describe('Duplicate Check-In', () => {
    it('should fail on duplicate check-in and create audit trail', async () => {
      const ticket = createCheckedInTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: eventStartDate,
        endDate: eventEndDate,
      });

      const command = new CheckInTicketCommand(
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CHECK_IN_FAILED');

      // Audit record is still saved for the invalid check-in attempt
      expect(mockCheckInRepository.save).toHaveBeenCalled();
    });
  });
});
