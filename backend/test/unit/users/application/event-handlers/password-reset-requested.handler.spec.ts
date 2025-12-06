import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PasswordResetRequestedEventHandler } from '../../../../../src/modules/users/application/event-handlers/password-reset-requested.handler';
import { PasswordResetRequestedEvent } from '../../../../../src/modules/users/domain/events/password-reset-requested.event';

describe('PasswordResetRequestedEventHandler', () => {
  let handler: PasswordResetRequestedEventHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordResetRequestedEventHandler],
    }).compile();

    handler = module.get<PasswordResetRequestedEventHandler>(
      PasswordResetRequestedEventHandler,
    );
    
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

    it('should process PasswordResetRequestedEvent successfully', async () => {
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
      const event = new PasswordResetRequestedEvent(
        'user-123',
        'reset@example.com',
        'reset-token-abc',
        expiresAt,
        new Date('2024-01-01'),
      );

      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log the start of event processing', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'user-456',
        'john@example.com',
        'token-xyz',
        expiresAt,
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing PasswordResetRequestedEvent for user user-456'),
      );
    });

    it('should log the completion of event processing', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'user-789',
        'jane@example.com',
        'token-123',
        expiresAt,
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('PasswordResetRequestedEvent processed for user user-789'),
      );
    });

    it('should include email in completion log', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'user-abc',
        'test@domain.com',
        'token-def',
        expiresAt,
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@domain.com'),
      );
    });

    it('should handle event with all properties', async () => {
      const requestedAt = new Date('2024-06-15T10:30:00Z');
      const expiresAt = new Date('2024-06-15T11:30:00Z');
      const event = new PasswordResetRequestedEvent(
        'complete-user-id',
        'complete@example.com',
        'complete-token',
        expiresAt,
        requestedAt,
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple events sequentially', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event1 = new PasswordResetRequestedEvent(
        'user-1',
        'user1@example.com',
        'token-1',
        expiresAt,
      );
      const event2 = new PasswordResetRequestedEvent(
        'user-2',
        'user2@example.com',
        'token-2',
        expiresAt,
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

    it('should mention reset email in log message', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'email-user',
        'reset-email@example.com',
        'reset-token',
        expiresAt,
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('reset email will be sent'),
      );
    });
  });

  describe('event properties', () => {
    it('should process event with auto-generated requestedAt', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'auto-date-user',
        'auto@example.com',
        'auto-token',
        expiresAt,
      );

      // Default date should be set
      expect(event.requestedAt).toBeInstanceOf(Date);
      
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should preserve event data during processing', async () => {
      const requestedAt = new Date('2024-03-20T14:00:00Z');
      const expiresAt = new Date('2024-03-20T15:00:00Z');
      const event = new PasswordResetRequestedEvent(
        'preserve-user',
        'preserve@example.com',
        'preserve-token',
        expiresAt,
        requestedAt,
      );

      expect(event.userId).toBe('preserve-user');
      expect(event.email).toBe('preserve@example.com');
      expect(event.resetToken).toBe('preserve-token');
      expect(event.expiresAt).toBe(expiresAt);
      expect(event.requestedAt).toBe(requestedAt);
      
      await handler.handle(event);
    });
  });
});
