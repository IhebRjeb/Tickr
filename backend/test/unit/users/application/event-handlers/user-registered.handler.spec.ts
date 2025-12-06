import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRegisteredEventHandler } from '../../../../../src/modules/users/application/event-handlers/user-registered.handler';
import { UserRegisteredEvent } from '../../../../../src/modules/users/domain/events/user-registered.event';

describe('UserRegisteredEventHandler', () => {
  let handler: UserRegisteredEventHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRegisteredEventHandler],
    }).compile();

    handler = module.get<UserRegisteredEventHandler>(UserRegisteredEventHandler);
    
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

    it('should process UserRegisteredEvent successfully', async () => {
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'John',
        'Doe',
        'verification-token-abc',
        new Date('2024-01-01'),
      );

      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log the start of event processing', async () => {
      const event = new UserRegisteredEvent(
        'user-456',
        'john@example.com',
        'John',
        'Doe',
        'token-xyz',
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing UserRegisteredEvent for user user-456'),
      );
    });

    it('should log the completion of event processing', async () => {
      const event = new UserRegisteredEvent(
        'user-789',
        'jane@example.com',
        'Jane',
        'Doe',
        'token-123',
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('UserRegisteredEvent processed for user user-789'),
      );
    });

    it('should include email in completion log', async () => {
      const event = new UserRegisteredEvent(
        'user-abc',
        'test@domain.com',
        'Test',
        'User',
        'token-def',
      );

      await handler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@domain.com'),
      );
    });

    it('should handle event with all properties', async () => {
      const registeredAt = new Date('2024-06-15T10:30:00Z');
      const event = new UserRegisteredEvent(
        'complete-user-id',
        'complete@example.com',
        'Complete',
        'User',
        'complete-token',
        registeredAt,
      );

      await handler.handle(event);

      // Should complete without error
      expect(loggerSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple events sequentially', async () => {
      const event1 = new UserRegisteredEvent(
        'user-1',
        'user1@example.com',
        'User',
        'One',
        'token-1',
      );
      const event2 = new UserRegisteredEvent(
        'user-2',
        'user2@example.com',
        'User',
        'Two',
        'token-2',
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
    it('should process event with auto-generated registeredAt', async () => {
      const event = new UserRegisteredEvent(
        'auto-date-user',
        'auto@example.com',
        'Auto',
        'Date',
        'auto-token',
      );

      // Default date should be set
      expect(event.registeredAt).toBeInstanceOf(Date);
      
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should preserve event data during processing', async () => {
      const event = new UserRegisteredEvent(
        'preserve-user',
        'preserve@example.com',
        'Preserve',
        'Data',
        'preserve-token',
      );

      // Event data should be accessible after handler creation
      expect(event.userId).toBe('preserve-user');
      expect(event.email).toBe('preserve@example.com');
      expect(event.firstName).toBe('Preserve');
      expect(event.lastName).toBe('Data');
      expect(event.verificationToken).toBe('preserve-token');
      
      await handler.handle(event);
    });
  });
});
