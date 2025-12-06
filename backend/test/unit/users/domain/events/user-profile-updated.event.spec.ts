import { UserProfileUpdatedEvent } from '../../../../../src/modules/users/domain/events/user-profile-updated.event';

describe('UserProfileUpdatedEvent', () => {
  describe('constructor', () => {
    it('should create event with userId and firstName change', () => {
      const userId = 'user-123';
      const changes = { firstName: 'NewFirstName' };
      
      const event = new UserProfileUpdatedEvent(userId, changes);
      
      expect(event.userId).toBe(userId);
      expect(event.changes).toEqual(changes);
      expect(event.changes.firstName).toBe('NewFirstName');
    });

    it('should create event with userId and lastName change', () => {
      const userId = 'user-456';
      const changes = { lastName: 'NewLastName' };
      
      const event = new UserProfileUpdatedEvent(userId, changes);
      
      expect(event.userId).toBe(userId);
      expect(event.changes).toEqual(changes);
      expect(event.changes.lastName).toBe('NewLastName');
    });

    it('should create event with userId and phone change', () => {
      const userId = 'user-789';
      const changes = { phone: '+1234567890' };
      
      const event = new UserProfileUpdatedEvent(userId, changes);
      
      expect(event.userId).toBe(userId);
      expect(event.changes).toEqual(changes);
      expect(event.changes.phone).toBe('+1234567890');
    });

    it('should create event with multiple changes', () => {
      const userId = 'user-multi';
      const changes = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1987654321',
      };
      
      const event = new UserProfileUpdatedEvent(userId, changes);
      
      expect(event.userId).toBe(userId);
      expect(event.changes).toEqual(changes);
    });

    it('should handle phone being set to null', () => {
      const userId = 'user-null-phone';
      const changes = { phone: null };
      
      const event = new UserProfileUpdatedEvent(userId, changes);
      
      expect(event.changes.phone).toBeNull();
    });

    it('should handle empty changes object', () => {
      const userId = 'user-empty';
      const changes = {};
      
      const event = new UserProfileUpdatedEvent(userId, changes);
      
      expect(event.userId).toBe(userId);
      expect(event.changes).toEqual({});
    });
  });

  describe('inherited properties', () => {
    it('should have unique eventId', () => {
      const event1 = new UserProfileUpdatedEvent('user-1', { firstName: 'A' });
      const event2 = new UserProfileUpdatedEvent('user-2', { firstName: 'B' });
      
      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have occurredOn timestamp', () => {
      const before = new Date();
      const event = new UserProfileUpdatedEvent('user-123', { firstName: 'Test' });
      const after = new Date();
      
      expect(event.occurredOn).toBeInstanceOf(Date);
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const changes = { firstName: 'Test', lastName: 'User' };
      const event = new UserProfileUpdatedEvent('user-123', changes);
      
      // TypeScript ensures readonly at compile time
      // At runtime, we verify the values are set correctly
      expect(event.userId).toBe('user-123');
      expect(event.changes).toEqual(changes);
    });
  });

  describe('use cases', () => {
    it('should track name change for audit', () => {
      const event = new UserProfileUpdatedEvent('user-audit', {
        firstName: 'NewFirst',
        lastName: 'NewLast',
      });
      
      // Event can be used for audit logging
      expect(event.changes.firstName).toBe('NewFirst');
      expect(event.changes.lastName).toBe('NewLast');
    });

    it('should track phone number update', () => {
      const event = new UserProfileUpdatedEvent('user-phone', {
        phone: '+33612345678',
      });
      
      expect(event.changes.phone).toBe('+33612345678');
    });

    it('should track phone number removal', () => {
      const event = new UserProfileUpdatedEvent('user-phone-remove', {
        phone: null,
      });
      
      expect(event.changes.phone).toBeNull();
    });
  });
});
