import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '@shared/domain/domain-event.base';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';
import { EventStoreService } from '@shared/infrastructure/events/event-store.service';

class TestEvent extends DomainEvent {
  constructor(public readonly data: string) {
    super();
  }
}

describe('DomainEventPublisher', () => {
  let publisher: DomainEventPublisher;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let eventStore: jest.Mocked<EventStoreService>;

  beforeEach(() => {
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    eventStore = {
      store: jest.fn().mockResolvedValue(undefined),
      markAsPublished: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventStoreService>;

    publisher = new DomainEventPublisher(eventEmitter, eventStore);
  });

  describe('publish', () => {
    it('should store event before publishing', async () => {
      const event = new TestEvent('test data');

      await publisher.publish(event);

      expect(eventStore.store).toHaveBeenCalledWith(event);
      // Verify store was called (outbox pattern)
      expect(eventStore.store).toHaveBeenCalledTimes(1);
    });

    it('should emit event with event name', async () => {
      const event = new TestEvent('test data');

      await publisher.publish(event);

      expect(eventEmitter.emit).toHaveBeenCalledWith('TestEvent', event);
    });

    it('should mark event as published after successful emit', async () => {
      const event = new TestEvent('test data');

      await publisher.publish(event);

      expect(eventStore.markAsPublished).toHaveBeenCalledWith(event.eventId);
    });

    it('should throw error if store fails', async () => {
      eventStore.store.mockRejectedValue(new Error('Store failed'));
      const event = new TestEvent('test data');

      await expect(publisher.publish(event)).rejects.toThrow('Store failed');
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('publishMany', () => {
    it('should publish multiple events in order', async () => {
      const events = [new TestEvent('event1'), new TestEvent('event2'), new TestEvent('event3')];

      await publisher.publishMany(events);

      expect(eventStore.store).toHaveBeenCalledTimes(3);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe('publishFromAggregate', () => {
    it('should pull and publish events from aggregate', async () => {
      const events = [new TestEvent('event1'), new TestEvent('event2')];
      const mockAggregate = {
        pullDomainEvents: jest.fn().mockReturnValue(events),
      };

      await publisher.publishFromAggregate(mockAggregate);

      expect(mockAggregate.pullDomainEvents).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    });
  });
});
