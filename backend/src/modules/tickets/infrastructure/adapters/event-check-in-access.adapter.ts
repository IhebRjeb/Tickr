import { ResolveEventCheckInAccessHandler } from '@modules/events/application/queries/resolve-event-check-in-access/resolve-event-check-in-access.handler';
import { ResolveEventCheckInAccessQuery } from '@modules/events/application/queries/resolve-event-check-in-access/resolve-event-check-in-access.query';
import { Injectable } from '@nestjs/common';

import type {
  EventCheckInAccessDecision,
  EventCheckInAccessPort,
} from '../../application/ports/event-check-in-access.port';

@Injectable()
export class EventCheckInAccessAdapter implements EventCheckInAccessPort {
  constructor(
    private readonly resolveEventCheckInAccessHandler: ResolveEventCheckInAccessHandler,
  ) {}

  async resolve(
    eventId: string,
    actorId: string,
  ): Promise<EventCheckInAccessDecision | null> {
    const result = await this.resolveEventCheckInAccessHandler.execute(
      new ResolveEventCheckInAccessQuery(eventId, actorId),
    );

    return result.isSuccess ? result.value : null;
  }
}