import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { EmailVerifiedEventHandler } from '../../../../../src/modules/users/application/event-handlers/email-verified.handler';
import { EmailVerifiedEvent } from '../../../../../src/modules/users/domain/events/email-verified.event';

describe('EmailVerifiedEventHandler', () => {
  let handler: EmailVerifiedEventHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailVerifiedEventHandler],
    }).compile();

    handler = module.get<EmailVerifiedEventHandler>(EmailVerifiedEventHandler);
    
    // Spy on logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  describe('handle', () => {
    it('should be defined', () => {
      expect(handler).toBeDefined();
    });

    it('should process EmailVerifiedEvent successfully', async () => {
      const event = new EmailVerifiedEvent(
        'user-123',
        'verified@example.com',
        new Date('2024-01-01'),
      );

      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log the start of event processing', async () => {
      const event = new EmailVerifiedEvent(
        'user-456',
        'john@example.com',
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing EmailVerifiedEvent for user user-456'),
      );
    });

    it('should log the completion of event processing', async () => {
      const event = new EmailVerifiedEvent(
        'user-789',
        'jane@example.com',
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('EmailVerifiedEvent processed for user user-789'),
      );
    });

    it('should include email in completion log', async () => {
      const event = new EmailVerifiedEvent(
        'user-abc',
        'test@domain.com',
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@domain.com'),
      );
    });

    it('should handle event with explicit verifiedAt', async () => {
      const verifiedAt = new Date('2024-06-15T10:30:00Z');
      const event = new EmailVerifiedEvent(
        'complete-user-id',
        'complete@example.com',
        verifiedAt,
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple events sequentially', async () => {
      const event1 = new EmailVerifiedEvent(
        'user-1',
        'user1@example.com',
      );
      const event2 = new EmailVerifiedEvent(
        'user-2',
        'user2@example.com',
      );

      await handler.handle(event1);
      await handler.handle(event2);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('user-1'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('user-2'),
      );
    });
  });

  describe('event properties', () => {
    it('should process event with auto-generated verifiedAt', async () => {
      const event = new EmailVerifiedEvent(
        'auto-date-user',
        'auto@example.com',
      );

      // Default date should be set
      expect(event.verifiedAt).toBeInstanceOf(Date);
      
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should preserve event data during processing', async () => {
      const verifiedAt = new Date('2024-03-20T14:00:00Z');
      const event = new EmailVerifiedEvent(
        'preserve-user',
        'preserve@example.com',
        verifiedAt,
      );

      expect(event.userId).toBe('preserve-user');
      expect(event.email).toBe('preserve@example.com');
      expect(event.verifiedAt).toBe(verifiedAt);
      
      await handler.handle(event);
    });
  });
});
