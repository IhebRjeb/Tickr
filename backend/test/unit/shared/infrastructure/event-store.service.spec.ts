import { DomainEvent } from '@shared/domain/domain-event.base';
import { EventStoreService } from '@shared/infrastructure/events/event-store.service';

class TestEvent extends DomainEvent {
  constructor(public readonly data: string) {
    super();
  }
}

describe('EventStoreService', () => {
  let service: EventStoreService;

  beforeEach(() => {
    service = new EventStoreService();
  });

  describe('store', () => {
    it('should store event', async () => {
      const event = new TestEvent('test');

      await service.store(event);

      const unpublished = await service.getUnpublishedEvents();
      expect(unpublished).toHaveLength(1);
      expect(unpublished[0].eventId).toBe(event.eventId);
    });

    it('should store event with correct properties', async () => {
      const event = new TestEvent('test data');

      await service.store(event);

      const unpublished = await service.getUnpublishedEvents();
      expect(unpublished[0]).toMatchObject({
        eventId: event.eventId,
        eventName: 'TestEvent',
        retryCount: 0,
      });
    });
  });

  describe('markAsPublished', () => {
    it('should mark event as published', async () => {
      const event = new TestEvent('test');
      await service.store(event);

      await service.markAsPublished(event.eventId);

      const unpublished = await service.getUnpublishedEvents();
      expect(unpublished).toHaveLength(0);
    });

    it('should not throw for non-existent event', async () => {
      await expect(service.markAsPublished('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getUnpublishedEvents', () => {
    it('should return only unpublished events', async () => {
      const event1 = new TestEvent('test1');
      const event2 = new TestEvent('test2');
      
      await service.store(event1);
      await service.store(event2);
      await service.markAsPublished(event1.eventId);

      const unpublished = await service.getUnpublishedEvents();
      
      expect(unpublished).toHaveLength(1);
      expect(unpublished[0].eventId).toBe(event2.eventId);
    });

    it('should exclude events with retry count >= 3', async () => {
      const event = new TestEvent('test');
      await service.store(event);
      
      // Increment retry count 3 times
      await service.incrementRetryCount(event.eventId);
      await service.incrementRetryCount(event.eventId);
      await service.incrementRetryCount(event.eventId);

      const unpublished = await service.getUnpublishedEvents();
      
      expect(unpublished).toHaveLength(0);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      const event = new TestEvent('test');
      await service.store(event);

      await service.incrementRetryCount(event.eventId);
      await service.incrementRetryCount(event.eventId);

      const unpublished = await service.getUnpublishedEvents();
      expect(unpublished[0].retryCount).toBe(2);
    });
  });

  describe('getEventsByName', () => {
    it('should return events filtered by name', async () => {
      const event1 = new TestEvent('test1');
      const event2 = new TestEvent('test2');
      
      await service.store(event1);
      await service.store(event2);

      const events = await service.getEventsByName('TestEvent');
      
      expect(events).toHaveLength(2);
    });

    it('should return events sorted by occurredOn', async () => {
      const event1 = new TestEvent('first');
      await new Promise((r) => setTimeout(r, 10));
      const event2 = new TestEvent('second');
      
      await service.store(event1);
      await service.store(event2);

      const events = await service.getEventsByName('TestEvent');
      
      expect(events[0].eventId).toBe(event1.eventId);
      expect(events[1].eventId).toBe(event2.eventId);
    });

    it('should return empty array for non-existent event type', async () => {
      const events = await service.getEventsByName('NonExistentEvent');
      
      expect(events).toHaveLength(0);
    });
  });
});
