/**
 * @file CheckInTicketHandler Unit Tests
 */

import { CheckInTicketCommand } from '@modules/tickets/application/commands/check-in-ticket/check-in-ticket.command';
import { CheckInTicketHandler } from '@modules/tickets/application/commands/check-in-ticket/check-in-ticket.handler';
import type { CheckInRepositoryPort } from '@modules/tickets/application/ports/check-in.repository.port';
import type { EventCheckInAccessPort } from '@modules/tickets/application/ports/event-check-in-access.port';
import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketCheckInPersistencePort } from '@modules/tickets/application/ports/ticket-check-in-persistence.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('CheckInTicketHandler', () => {
  let handler: CheckInTicketHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockCheckInRepository: jest.Mocked<CheckInRepositoryPort>;
  let mockEventCheckInAccess: jest.Mocked<EventCheckInAccessPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;
  let mockTicketCheckInPersistence: jest.Mocked<TicketCheckInPersistencePort>;

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
      getCheckInStats: jest.fn(),
    } as any;

    mockCheckInRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTicketId: jest.fn(),
      findByEventId: jest.fn(),
      countByEventId: jest.fn(),
    } as any;

    mockEventCheckInAccess = {
      resolve: jest.fn().mockResolvedValue({
        eventId: validEventId,
        startDate: eventStartDate,
        endDate: eventEndDate,
        authorizationSource: 'ASSIGNMENT',
        assignmentId: '550e8400-e29b-41d4-a716-446655440020',
        canCheckIn: true,
        canViewBasicStats: true,
      }),
    };
    mockEventQuery = {
      getTicketTypesByIds: jest.fn().mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'VIP Access',
        },
      ]),
    } as unknown as jest.Mocked<EventQueryPort>;

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    mockTicketCheckInPersistence = {
      commitSuccessfulCheckIn: jest.fn().mockResolvedValue(true),
    };

    handler = new CheckInTicketHandler(
      mockTicketRepository,
      mockCheckInRepository,
      mockEventCheckInAccess,
      mockEventQuery,
      mockEventPublisher,
      mockTicketCheckInPersistence,
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
      const command = new CheckInTicketCommand(
        validEventId,
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.holderName).toBe('John Doe');
      expect(result.value.ticketTypeName).toBe('VIP Access');
      expect(ticket.status).toBe(TicketStatus.CHECKED_IN);
    });

    it('should create check-in audit record', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      const command = new CheckInTicketCommand(
        validEventId,
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      await handler.execute(command);

      expect(
        mockTicketCheckInPersistence.commitSuccessfulCheckIn,
      ).toHaveBeenCalled();
    });

    it('should publish domain events', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      const command = new CheckInTicketCommand(
        validEventId,
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalled();
    });

    it('returns success when post-commit event publication fails', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      mockEventPublisher.publishFromAggregate.mockRejectedValue(
        new Error('Event bus unavailable'),
      );

      const result = await handler.execute(
        new CheckInTicketCommand(
          validEventId,
          ticket.qrCode.value,
          validStaffId,
          'scanner-001',
          'Gate A',
        ),
      );

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('QR Code Validation', () => {
    it('should fail with invalid QR code format', async () => {
      const command = new CheckInTicketCommand(
        validEventId,
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
        validEventId,
        validQr,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKET_NOT_FOUND');
    });

    it('does not accept a valid QR code from another event', async () => {
      const ticket = createConfirmedTicket();
      const otherEventId = '550e8400-e29b-41d4-a716-446655440099';
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);

      const command = new CheckInTicketCommand(
        otherEventId,
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      mockEventCheckInAccess.resolve.mockResolvedValue({
        eventId: otherEventId,
        startDate: eventStartDate,
        endDate: eventEndDate,
        authorizationSource: 'ASSIGNMENT',
        assignmentId: '550e8400-e29b-41d4-a716-446655440020',
        canCheckIn: true,
        canViewBasicStats: true,
      });

      const result = await handler.execute(command);

      expect(result.error.type).toBe('TICKET_NOT_FOUND');
      expect(
        mockTicketCheckInPersistence.commitSuccessfulCheckIn,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Atomic Persistence', () => {
    it('returns duplicate failure when another scanner wins the transition', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      mockTicketCheckInPersistence.commitSuccessfulCheckIn.mockResolvedValue(
        false,
      );

      const result = await handler.execute(
        new CheckInTicketCommand(
          validEventId,
          ticket.qrCode.value,
          validStaffId,
          'scanner-001',
          'Gate A',
        ),
      );

      expect(result.error.type).toBe('CHECK_IN_FAILED');
      expect(mockCheckInRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isValid: false }),
      );
      expect(mockEventPublisher.publishFromAggregate).not.toHaveBeenCalled();
    });

    it('persists assignment authorization provenance', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);

      await handler.execute(
        new CheckInTicketCommand(
          validEventId,
          ticket.qrCode.value,
          validStaffId,
          'scanner-001',
          'Gate A',
        ),
      );

      expect(
        mockTicketCheckInPersistence.commitSuccessfulCheckIn,
      ).toHaveBeenCalledWith(
        ticket,
        expect.objectContaining({
          authorizationSource: 'ASSIGNMENT',
          assignmentId: '550e8400-e29b-41d4-a716-446655440020',
        }),
      );
    });
  });

  describe('Time Window Validation', () => {
    it('should fail when check-in is too early (before window opens)', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);

      // Event starts in 3 hours → window opens in 2 hours → too early
      const futureStart = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 8 * 60 * 60 * 1000);

      mockEventCheckInAccess.resolve.mockResolvedValue({
        eventId: validEventId,
        startDate: futureStart,
        endDate: futureEnd,
        authorizationSource: 'ASSIGNMENT',
        assignmentId: '550e8400-e29b-41d4-a716-446655440020',
        canCheckIn: true,
        canViewBasicStats: true,
      });

      const command = new CheckInTicketCommand(
        validEventId,
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

      mockEventCheckInAccess.resolve.mockResolvedValue({
        eventId: validEventId,
        startDate: pastStart,
        endDate: pastEnd,
        authorizationSource: 'ASSIGNMENT',
        assignmentId: '550e8400-e29b-41d4-a716-446655440020',
        canCheckIn: true,
        canViewBasicStats: true,
      });

      const command = new CheckInTicketCommand(
        validEventId,
        ticket.qrCode.value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CHECK_IN_OUTSIDE_WINDOW');
    });

    it('should fail when event access is denied', async () => {
      mockEventCheckInAccess.resolve.mockResolvedValue(null);

      const command = new CheckInTicketCommand(
        validEventId,
        QRCodeVO.generate().value,
        validStaffId,
        'scanner-001',
        'Gate A',
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CHECK_IN_FORBIDDEN');
      expect(mockTicketRepository.findByQRCode).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Check-In', () => {
    it('should fail on duplicate check-in and create audit trail', async () => {
      const ticket = createCheckedInTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);
      const command = new CheckInTicketCommand(
        validEventId,
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
