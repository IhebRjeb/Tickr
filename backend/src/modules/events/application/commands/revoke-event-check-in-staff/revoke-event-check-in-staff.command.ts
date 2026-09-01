import { BaseCommand } from '@shared/application/interfaces/command.interface';

export type RevokeEventCheckInStaffError =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'ASSIGNMENT_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export class RevokeEventCheckInStaffCommand extends BaseCommand {
  constructor(
    public readonly eventId: string,
    public readonly assignmentId: string,
    public readonly organizerId: string,
  ) {
    super();
    Object.freeze(this);
  }
}