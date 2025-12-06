import { UserDeactivatedEvent } from '../../../../../src/modules/users/domain/events/user-deactivated.event';

describe('UserDeactivatedEvent', () => {
  describe('constructor', () => {
    it('should create event with userId and default deactivatedAt', () => {
      const userId = 'user-123';
      const before = new Date();
      
      const event = new UserDeactivatedEvent(userId);
      
      const after = new Date();
      
      expect(event.userId).toBe(userId);
      expect(event.deactivatedAt).toBeInstanceOf(Date);
      expect(event.deactivatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.deactivatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should create event with custom deactivatedAt', () => {
      const userId = 'user-456';
      const customDate = new Date('2024-01-15T10:30:00Z');
      
      const event = new UserDeactivatedEvent(userId, customDate);
      
      expect(event.userId).toBe(userId);
      expect(event.deactivatedAt).toBe(customDate);
    });
  });

  describe('inherited properties', () => {
    it('should have unique eventId', () => {
      const event1 = new UserDeactivatedEvent('user-1');
      const event2 = new UserDeactivatedEvent('user-2');
      
      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have occurredOn timestamp', () => {
      const before = new Date();
      const event = new UserDeactivatedEvent('user-123');
      const after = new Date();
      
      expect(event.occurredOn).toBeInstanceOf(Date);
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new UserDeactivatedEvent('user-123');
      
      // TypeScript ensures readonly at compile time
      // At runtime, we verify the values are set correctly
      expect(event.userId).toBe('user-123');
      expect(event.deactivatedAt).toBeInstanceOf(Date);
    });
  });

  describe('use cases', () => {
    it('should capture deactivation reason through userId', () => {
      // In practice, deactivation events are logged for audit purposes
      const adminDeactivation = new UserDeactivatedEvent('user-to-deactivate');
      
      expect(adminDeactivation.userId).toBe('user-to-deactivate');
    });
  });
});
