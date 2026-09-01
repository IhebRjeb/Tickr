import { Injectable } from '@nestjs/common';

import { EventCheckInStaffAssignmentEntity } from '../../../domain/entities/event-check-in-staff-assignment.entity';
import { EventCheckInStaffAssignmentOrmEntity } from '../entities/event-check-in-staff-assignment.orm-entity';

@Injectable()
export class EventCheckInStaffAssignmentMapper {
  toPersistence(
    domain: EventCheckInStaffAssignmentEntity,
  ): EventCheckInStaffAssignmentOrmEntity {
    const entity = new EventCheckInStaffAssignmentOrmEntity();
    entity.id = domain.id;
    entity.eventId = domain.eventId;
    entity.userId = domain.userId;
    entity.assignedBy = domain.assignedBy;
    entity.assignedAt = domain.assignedAt;
    entity.revokedAt = domain.revokedAt;
    entity.revokedBy = domain.revokedBy;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  toDomain(
    raw: EventCheckInStaffAssignmentOrmEntity,
  ): EventCheckInStaffAssignmentEntity {
    return EventCheckInStaffAssignmentEntity.reconstitute({
      id: raw.id,
      eventId: raw.eventId,
      userId: raw.userId,
      assignedBy: raw.assignedBy,
      assignedAt: raw.assignedAt,
      revokedAt: raw.revokedAt,
      revokedBy: raw.revokedBy,
      updatedAt: raw.updatedAt,
    });
  }
}