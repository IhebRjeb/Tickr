import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { EventCheckInStaffAssignmentDto } from '../../dtos/event-check-in-staff.dto';

export type AssignEventCheckInStaffError =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string }
  | { type: 'EVENT_NOT_ASSIGNABLE'; message: string }
  | { type: 'TARGET_NOT_ELIGIBLE'; message: string }
  | { type: 'ALREADY_ASSIGNED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export type AssignEventCheckInStaffResult = EventCheckInStaffAssignmentDto;

export class AssignEventCheckInStaffCommand extends BaseCommand {
  constructor(
    public readonly eventId: string,
    public readonly organizerId: string,
    public readonly email: string,
  ) {
    super();
    Object.freeze(this);
  }
}