import type { PaginatedResult } from '@shared/application/interfaces/repository.interface';

import type { EventCheckInStaffAssignmentEntity } from '../../domain/entities/event-check-in-staff-assignment.entity';

export const EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY = Symbol(
  'EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY',
);

export interface EventCheckInStaffAssignmentRepositoryPort {
  save(
    assignment: EventCheckInStaffAssignmentEntity,
  ): Promise<EventCheckInStaffAssignmentEntity>;

  findById(id: string): Promise<EventCheckInStaffAssignmentEntity | null>;

  findActiveByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<EventCheckInStaffAssignmentEntity | null>;

  findByEvent(
    eventId: string,
    page: number,
    limit: number,
    includeRevoked?: boolean,
  ): Promise<PaginatedResult<EventCheckInStaffAssignmentEntity>>;

  findActiveByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EventCheckInStaffAssignmentEntity>>;

  revoke(assignment: EventCheckInStaffAssignmentEntity): Promise<boolean>;
}