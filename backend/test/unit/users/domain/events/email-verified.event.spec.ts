import { EmailVerifiedEvent } from '../../../../../src/modules/users/domain/events/email-verified.event';

describe('EmailVerifiedEvent', () => {
  describe('constructor', () => {
    it('should create event with all properties', () => {
      const verifiedAt = new Date('2024-01-15T10:00:00Z');
      const event = new EmailVerifiedEvent(
        'user-123',
        'test@example.com',
        verifiedAt,
      );

      expect(event.userId).toBe('user-123');
      expect(event.email).toBe('test@example.com');
      expect(event.verifiedAt).toBe(verifiedAt);
    });

    it('should set default verifiedAt to current date', () => {
      const before = new Date();
      const event = new EmailVerifiedEvent(
        'user-456',
        'test@example.com',
      );
      const after = new Date();

      expect(event.verifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.verifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should have occurredOn from base DomainEvent', () => {
      const event = new EmailVerifiedEvent(
        'user-789',
        'test@example.com',
      );

      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should have eventId from base DomainEvent', () => {
      const event = new EmailVerifiedEvent(
        'user-abc',
        'test@example.com',
      );

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should have correct eventName', () => {
      const event = new EmailVerifiedEvent(
        'user-def',
        'test@example.com',
      );

      expect(event.eventName).toBe('EmailVerifiedEvent');
    });
  });

  describe('multiple instances', () => {
    it('should create unique eventIds for each instance', () => {
      const event1 = new EmailVerifiedEvent(
        'user-1',
        'user1@example.com',
      );
      const event2 = new EmailVerifiedEvent(
        'user-2',
        'user2@example.com',
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have independent property values', () => {
      const event1 = new EmailVerifiedEvent(
        'user-a',
        'a@example.com',
      );
      const event2 = new EmailVerifiedEvent(
        'user-b',
        'b@example.com',
      );

      expect(event1.userId).not.toBe(event2.userId);
      expect(event1.email).not.toBe(event2.email);
    });
  });

  describe('toJSON', () => {
    it('should serialize event to JSON', () => {
      const verifiedAt = new Date('2024-02-20T12:00:00Z');
      const event = new EmailVerifiedEvent(
        'user-json',
        'json@example.com',
        verifiedAt,
      );

      const json = event.toJSON();

      expect(json.eventId).toBe(event.eventId);
      expect(json.eventName).toBe('EmailVerifiedEvent');
      expect(json.occurredOn).toBe(event.occurredOn.toISOString());
    });
  });
});
