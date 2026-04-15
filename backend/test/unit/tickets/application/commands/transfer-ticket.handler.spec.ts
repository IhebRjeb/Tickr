/**
 * @file TransferTicketHandler Unit Tests
 */

import { TransferTicketCommand } from '@modules/tickets/application/commands/transfer-ticket/transfer-ticket.command';
import { TransferTicketHandler } from '@modules/tickets/application/commands/transfer-ticket/transfer-ticket.handler';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import type { UserQueryPort } from '@modules/tickets/application/ports/user-query.port';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('TransferTicketHandler', () => {
  let handler: TransferTicketHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockUserQuery: jest.Mocked<UserQueryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const ticketId = '550e8400-e29b-41d4-a716-446655440010';
  const currentOwnerId = '550e8400-e29b-41d4-a716-446655440003';
  const newOwnerId = '550e8400-e29b-41d4-a716-446655440006';
  const newOwnerEmail = 'newowner@example.com';

  const createConfirmedTicket = (): TicketEntity => {
    return TicketEntity.reconstitute({
      id: ticketId,
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: 'order-123',
      userId: currentOwnerId,
      qrCode: QRCodeVO.generate(),
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

  beforeEach(() => {
    mockTicketRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockUserQuery = {
      getUserByEmail: jest.fn(),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new TransferTicketHandler(
      mockTicketRepository,
      mockUserQuery,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('Success', () => {
    it('should transfer ticket to new owner', async () => {
      const ticket = createConfirmedTicket();
      const originalQr = ticket.qrCode.value;

      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockUserQuery.getUserByEmail.mockResolvedValue({
        id: newOwnerId,
        email: newOwnerEmail,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const command = new TransferTicketCommand(ticketId, currentOwnerId, newOwnerEmail);
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.newQrCode).toBeDefined();
      expect(result.value.newQrCode).not.toBe(originalQr);
      expect(ticket.userId).toBe(newOwnerId);
    });

    it('should generate new QR code', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockUserQuery.getUserByEmail.mockResolvedValue({
        id: newOwnerId,
        email: newOwnerEmail,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const command = new TransferTicketCommand(ticketId, currentOwnerId, newOwnerEmail);
      const result = await handler.execute(command);

      expect(result.value.newQrCode).toMatch(/^v1-/);
    });

    it('should publish domain events', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockUserQuery.getUserByEmail.mockResolvedValue({
        id: newOwnerId,
        email: newOwnerEmail,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const command = new TransferTicketCommand(ticketId, currentOwnerId, newOwnerEmail);
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalled();
    });
  });

  describe('Failures', () => {
    it('should fail when ticket not found', async () => {
      mockTicketRepository.findById.mockResolvedValue(null);

      const command = new TransferTicketCommand(ticketId, currentOwnerId, newOwnerEmail);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKET_NOT_FOUND');
    });

    it('should fail when requester is not the ticket owner', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const command = new TransferTicketCommand(
        ticketId,
        '550e8400-e29b-41d4-a716-446655440099', // Different user
        newOwnerEmail,
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_TICKET_OWNER');
    });

    it('should fail when new owner not found by email', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockUserQuery.getUserByEmail.mockResolvedValue(null);

      const command = new TransferTicketCommand(ticketId, currentOwnerId, 'nobody@nowhere.com');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_NOT_FOUND');
    });

    it('should fail when max transfers reached', async () => {
      const ticket = TicketEntity.reconstitute({
        id: ticketId,
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
        orderId: 'order-123',
        userId: currentOwnerId,
        qrCode: QRCodeVO.generate(),
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
        transferCount: 3, // Already at max
        reservedUntil: null,
        pdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockUserQuery.getUserByEmail.mockResolvedValue({
        id: newOwnerId,
        email: newOwnerEmail,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const command = new TransferTicketCommand(ticketId, currentOwnerId, newOwnerEmail);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TRANSFER_FAILED');
    });

    it('should fail on persistence error', async () => {
      const ticket = createConfirmedTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockUserQuery.getUserByEmail.mockResolvedValue({
        id: newOwnerId,
        email: newOwnerEmail,
        firstName: 'Jane',
        lastName: 'Smith',
      });
      mockTicketRepository.save.mockRejectedValue(new Error('DB error'));

      const command = new TransferTicketCommand(ticketId, currentOwnerId, newOwnerEmail);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
