import { DomainEvent } from '@shared/domain/domain-event.base';

// Concrete implementation for testing
class TestDomainEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly data: string,
  ) {
    super();
  }
}

describe('DomainEvent', () => {
  describe('constructor', () => {
    it('should create event with occurredOn timestamp', () => {
      const beforeCreate = new Date();
      const event = new TestDomainEvent('123', 'test data');
      const afterCreate = new Date();

      expect(event.occurredOn).toBeInstanceOf(Date);
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should generate unique eventId', () => {
      const event1 = new TestDomainEvent('123', 'data');
      const event2 = new TestDomainEvent('123', 'data');

      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('eventName', () => {
    it('should return class name as event name', () => {
      const event = new TestDomainEvent('123', 'data');

      expect(event.eventName).toBe('TestDomainEvent');
    });
  });

  describe('toJSON', () => {
    it('should serialize event to JSON', () => {
      const event = new TestDomainEvent('123', 'test data');
      const json = event.toJSON();

      expect(json.eventId).toBe(event.eventId);
      expect(json.eventName).toBe('TestDomainEvent');
      expect(json.occurredOn).toBe(event.occurredOn.toISOString());
      expect(json.aggregateId).toBe('123');
      expect(json.data).toBe('test data');
    });

    it('should include all custom properties in getData', () => {
      const event = new TestDomainEvent('agg-1', 'my data');
      const json = event.toJSON();

      expect(json.aggregateId).toBe('agg-1');
      expect(json.data).toBe('my data');
    });
  });
});
