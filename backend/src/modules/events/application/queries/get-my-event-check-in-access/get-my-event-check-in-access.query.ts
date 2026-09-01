import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedEventCheckInAccessDto } from '../../dtos/event-check-in-staff.dto';

export type GetMyEventCheckInAccessError = {
  type: 'ACCESS_DENIED';
  message: string;
};

export class GetMyEventCheckInAccessQuery extends BaseQuery<PaginatedEventCheckInAccessDto> {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }
}