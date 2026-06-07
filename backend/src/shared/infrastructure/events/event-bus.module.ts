import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DOMAIN_EVENT_PUBLISHER } from '../../application/interfaces/domain-event-publisher.port';

import { DomainEventPublisher } from './domain-event.publisher';
import { EventStoreService } from './event-store.service';

const domainEventPublisherProvider = {
  provide: DOMAIN_EVENT_PUBLISHER,
  useExisting: DomainEventPublisher,
};

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [DomainEventPublisher, EventStoreService, domainEventPublisherProvider],
  exports: [DomainEventPublisher, EventStoreService, domainEventPublisherProvider],
})
export class EventBusModule {}
