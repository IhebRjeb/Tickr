import { UserRegisteredEvent } from '../../../../../src/modules/users/domain/events/user-registered.event';

describe('UserRegisteredEvent', () => {
  describe('constructor', () => {
    it('should create event with all required properties', () => {
      const registeredAt = new Date('2024-01-15T10:00:00Z');
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'John',
        'Doe',
        'verification-token-abc',
        registeredAt,
      );

      expect(event.userId).toBe('user-123');
      expect(event.email).toBe('test@example.com');
      expect(event.firstName).toBe('John');
      expect(event.lastName).toBe('Doe');
      expect(event.verificationToken).toBe('verification-token-abc');
      expect(event.registeredAt).toBe(registeredAt);
    });

    it('should set default registeredAt to current date', () => {
      const before = new Date();
      const event = new UserRegisteredEvent(
        'user-456',
        'test@example.com',
        'Jane',
        'Doe',
        'token-xyz',
      );
      const after = new Date();

      expect(event.registeredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.registeredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should have occurredOn from base DomainEvent', () => {
      const event = new UserRegisteredEvent(
        'user-789',
        'test@example.com',
        'Test',
        'User',
        'token-123',
      );

      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should have eventId from base DomainEvent', () => {
      const event = new UserRegisteredEvent(
        'user-abc',
        'test@example.com',
        'Test',
        'User',
        'token-456',
      );

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should have correct eventName', () => {
      const event = new UserRegisteredEvent(
        'user-def',
        'test@example.com',
        'Test',
        'User',
        'token-789',
      );

      expect(event.eventName).toBe('UserRegisteredEvent');
    });
  });

  describe('multiple instances', () => {
    it('should create unique eventIds for each instance', () => {
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

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have independent property values', () => {
      const event1 = new UserRegisteredEvent(
        'user-a',
        'a@example.com',
        'Alice',
        'A',
        'token-a',
      );
      const event2 = new UserRegisteredEvent(
        'user-b',
        'b@example.com',
        'Bob',
        'B',
        'token-b',
      );

      expect(event1.userId).not.toBe(event2.userId);
      expect(event1.email).not.toBe(event2.email);
      expect(event1.firstName).not.toBe(event2.firstName);
    });
  });

  describe('toJSON', () => {
    it('should serialize event to JSON', () => {
      const registeredAt = new Date('2024-02-20T12:00:00Z');
      const event = new UserRegisteredEvent(
        'user-json',
        'json@example.com',
        'Json',
        'User',
        'json-token',
        registeredAt,
      );

      const json = event.toJSON();

      expect(json.eventId).toBe(event.eventId);
      expect(json.eventName).toBe('UserRegisteredEvent');
      expect(json.occurredOn).toBe(event.occurredOn.toISOString());
    });
  });
});
