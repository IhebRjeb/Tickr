import { PasswordChangedEvent } from '../../../../../src/modules/users/domain/events/password-changed.event';

describe('PasswordChangedEvent', () => {
  describe('constructor', () => {
    it('should create event with userId and default changedAt', () => {
      const userId = 'user-123';
      const before = new Date();
      
      const event = new PasswordChangedEvent(userId);
      
      const after = new Date();
      
      expect(event.userId).toBe(userId);
      expect(event.changedAt).toBeInstanceOf(Date);
      expect(event.changedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.changedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should create event with custom changedAt', () => {
      const userId = 'user-456';
      const customDate = new Date('2024-01-15T10:30:00Z');
      
      const event = new PasswordChangedEvent(userId, customDate);
      
      expect(event.userId).toBe(userId);
      expect(event.changedAt).toBe(customDate);
    });
  });

  describe('inherited properties', () => {
    it('should have unique eventId', () => {
      const event1 = new PasswordChangedEvent('user-1');
      const event2 = new PasswordChangedEvent('user-2');
      
      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have occurredOn timestamp', () => {
      const before = new Date();
      const event = new PasswordChangedEvent('user-123');
      const after = new Date();
      
      expect(event.occurredOn).toBeInstanceOf(Date);
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new PasswordChangedEvent('user-123');
      
      // TypeScript ensures readonly at compile time
      // At runtime, we verify the values are set correctly
      expect(event.userId).toBe('user-123');
      expect(event.changedAt).toBeInstanceOf(Date);
    });
  });
});
