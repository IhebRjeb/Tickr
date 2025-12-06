import { PasswordResetRequestedEvent } from '../../../../../src/modules/users/domain/events/password-reset-requested.event';

describe('PasswordResetRequestedEvent', () => {
  describe('constructor', () => {
    it('should create event with all properties', () => {
      const expiresAt = new Date('2024-01-15T11:00:00Z');
      const requestedAt = new Date('2024-01-15T10:00:00Z');
      const event = new PasswordResetRequestedEvent(
        'user-123',
        'test@example.com',
        'reset-token-abc',
        expiresAt,
        requestedAt,
      );

      expect(event.userId).toBe('user-123');
      expect(event.email).toBe('test@example.com');
      expect(event.resetToken).toBe('reset-token-abc');
      expect(event.expiresAt).toBe(expiresAt);
      expect(event.requestedAt).toBe(requestedAt);
    });

    it('should set default requestedAt to current date', () => {
      const before = new Date();
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'user-456',
        'test@example.com',
        'token-xyz',
        expiresAt,
      );
      const after = new Date();

      expect(event.requestedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.requestedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should have occurredOn from base DomainEvent', () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'user-789',
        'test@example.com',
        'token-123',
        expiresAt,
      );

      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should have eventId from base DomainEvent', () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'user-abc',
        'test@example.com',
        'token-456',
        expiresAt,
      );

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should have correct eventName', () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event = new PasswordResetRequestedEvent(
        'user-def',
        'test@example.com',
        'token-789',
        expiresAt,
      );

      expect(event.eventName).toBe('PasswordResetRequestedEvent');
    });

    it('should preserve expiresAt date', () => {
      const expiresAt = new Date('2024-06-15T15:00:00Z');
      const event = new PasswordResetRequestedEvent(
        'user-expires',
        'expires@example.com',
        'expires-token',
        expiresAt,
      );

      expect(event.expiresAt).toBe(expiresAt);
      expect(event.expiresAt.toISOString()).toBe('2024-06-15T15:00:00.000Z');
    });
  });

  describe('multiple instances', () => {
    it('should create unique eventIds for each instance', () => {
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

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have independent property values', () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const event1 = new PasswordResetRequestedEvent(
        'user-a',
        'a@example.com',
        'token-a',
        expiresAt,
      );
      const event2 = new PasswordResetRequestedEvent(
        'user-b',
        'b@example.com',
        'token-b',
        expiresAt,
      );

      expect(event1.userId).not.toBe(event2.userId);
      expect(event1.email).not.toBe(event2.email);
      expect(event1.resetToken).not.toBe(event2.resetToken);
    });
  });

  describe('toJSON', () => {
    it('should serialize event to JSON', () => {
      const expiresAt = new Date('2024-02-20T13:00:00Z');
      const requestedAt = new Date('2024-02-20T12:00:00Z');
      const event = new PasswordResetRequestedEvent(
        'user-json',
        'json@example.com',
        'json-token',
        expiresAt,
        requestedAt,
      );

      const json = event.toJSON();

      expect(json.eventId).toBe(event.eventId);
      expect(json.eventName).toBe('PasswordResetRequestedEvent');
      expect(json.occurredOn).toBe(event.occurredOn.toISOString());
    });
  });
});
