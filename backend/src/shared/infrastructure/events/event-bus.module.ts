import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DomainEventPublisher } from './domain-event.publisher';
import { EventStoreService } from './event-store.service';

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
  providers: [DomainEventPublisher, EventStoreService],
  exports: [DomainEventPublisher, EventStoreService],
})
export class EventBusModule {}
