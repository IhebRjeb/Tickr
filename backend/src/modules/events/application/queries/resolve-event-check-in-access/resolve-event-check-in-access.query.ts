import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventCheckInAccessDecision } from '../../models/event-check-in-access.model';

export type ResolveEventCheckInAccessError =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export class ResolveEventCheckInAccessQuery extends BaseQuery<EventCheckInAccessDecision> {
  constructor(
    public readonly eventId: string,
    public readonly actorId: string,
  ) {
    super();
    Object.freeze(this);
  }
}