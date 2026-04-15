/**
 * @file Domain Event Handlers Unit Tests
 * @description Tests for all ticket event handlers (logging/side-effect stubs)
 */

import { DuplicateCheckInAttemptedEventHandler } from '@modules/tickets/application/event-handlers/duplicate-check-in-attempted.handler';
import { TicketCancelledEventHandler } from '@modules/tickets/application/event-handlers/ticket-cancelled.handler';
import { TicketConfirmedEventHandler } from '@modules/tickets/application/event-handlers/ticket-confirmed.handler';
import { TicketExpiredEventHandler } from '@modules/tickets/application/event-handlers/ticket-expired.handler';
import { DuplicateCheckInAttemptedEvent } from '@modules/tickets/domain/events/duplicate-check-in-attempted.event';
import { TicketCancelledEvent } from '@modules/tickets/domain/events/ticket-cancelled.event';
import { TicketConfirmedEvent } from '@modules/tickets/domain/events/ticket-confirmed.event';
import { TicketExpiredEvent } from '@modules/tickets/domain/events/ticket-expired.event';
import { Logger } from '@nestjs/common';

describe('Domain Event Handlers', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('DuplicateCheckInAttemptedEventHandler', () => {
    it('should log security warning', async () => {
      const handler = new DuplicateCheckInAttemptedEventHandler();
      const event = new DuplicateCheckInAttemptedEvent(
        '550e8400-e29b-41d4-a716-446655440010',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440003',
        new Date('2026-07-15T18:00:00Z'),
      );

      await handler.handle(event);

      expect(Logger.prototype.warn).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalled();
    });
  });

  describe('TicketCancelledEventHandler', () => {
    it('should log cancellation details', async () => {
      const handler = new TicketCancelledEventHandler();
      const event = new TicketCancelledEvent(
        '550e8400-e29b-41d4-a716-446655440010',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        'Changed plans',
        50,
        'TND',
        true,
      );

      await handler.handle(event);

      expect(Logger.prototype.log).toHaveBeenCalled();
      expect(Logger.prototype.debug).toHaveBeenCalled();
    });
  });

  describe('TicketConfirmedEventHandler', () => {
    it('should log confirmation details', async () => {
      const handler = new TicketConfirmedEventHandler();
      const event = new TicketConfirmedEvent(
        '550e8400-e29b-41d4-a716-446655440010',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        'order-123',
      );

      await handler.handle(event);

      expect(Logger.prototype.log).toHaveBeenCalled();
      expect(Logger.prototype.debug).toHaveBeenCalled();
    });
  });

  describe('TicketExpiredEventHandler', () => {
    it('should log expiration details', async () => {
      const handler = new TicketExpiredEventHandler();
      const event = new TicketExpiredEvent(
        '550e8400-e29b-41d4-a716-446655440010',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        new Date('2026-03-28T15:15:00Z'),
      );

      await handler.handle(event);

      expect(Logger.prototype.log).toHaveBeenCalled();
      expect(Logger.prototype.debug).toHaveBeenCalled();
    });
  });
});
