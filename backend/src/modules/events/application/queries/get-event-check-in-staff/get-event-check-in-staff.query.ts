import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedEventCheckInStaffAssignmentsDto } from '../../dtos/event-check-in-staff.dto';

export type GetEventCheckInStaffError =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export class GetEventCheckInStaffQuery extends BaseQuery<PaginatedEventCheckInStaffAssignmentsDto> {
  constructor(
    public readonly eventId: string,
    public readonly organizerId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }
}