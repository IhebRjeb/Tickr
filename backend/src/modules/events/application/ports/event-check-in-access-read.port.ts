import type { PaginatedResult } from '@shared/application/interfaces/repository.interface';

import type { EventCheckInAccessListItem } from '../models/event-check-in-access.model';

export const EVENT_CHECK_IN_ACCESS_READ_PORT = Symbol(
  'EVENT_CHECK_IN_ACCESS_READ_PORT',
);

export interface EventCheckInAccessReadPort {
  findAccessibleEvents(
    userId: string,
    isAdmin: boolean,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EventCheckInAccessListItem>>;
}