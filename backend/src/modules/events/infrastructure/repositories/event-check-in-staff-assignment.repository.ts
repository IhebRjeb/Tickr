import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginatedResult } from '@shared/application/interfaces/repository.interface';
import { IsNull, Repository } from 'typeorm';

import type { EventCheckInStaffAssignmentRepositoryPort } from '../../application/ports/event-check-in-staff-assignment.repository.port';
import type { EventCheckInStaffAssignmentEntity } from '../../domain/entities/event-check-in-staff-assignment.entity';
import { EventCheckInStaffAssignmentOrmEntity } from '../persistence/entities/event-check-in-staff-assignment.orm-entity';
import { EventCheckInStaffAssignmentMapper } from '../persistence/mappers/event-check-in-staff-assignment.mapper';

@Injectable()
export class EventCheckInStaffAssignmentTypeOrmRepository
  implements EventCheckInStaffAssignmentRepositoryPort
{
  constructor(
    @InjectRepository(EventCheckInStaffAssignmentOrmEntity)
    private readonly repository: Repository<EventCheckInStaffAssignmentOrmEntity>,
    private readonly mapper: EventCheckInStaffAssignmentMapper,
  ) {}

  async save(
    assignment: EventCheckInStaffAssignmentEntity,
  ): Promise<EventCheckInStaffAssignmentEntity> {
    const saved = await this.repository.save(
      this.mapper.toPersistence(assignment),
    );
    return this.mapper.toDomain(saved);
  }

  async findById(
    id: string,
  ): Promise<EventCheckInStaffAssignmentEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findActiveByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<EventCheckInStaffAssignmentEntity | null> {
    const entity = await this.repository.findOne({
      where: { eventId, userId, revokedAt: IsNull() },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByEvent(
    eventId: string,
    page: number,
    limit: number,
    includeRevoked: boolean = false,
  ): Promise<PaginatedResult<EventCheckInStaffAssignmentEntity>> {
    const query = this.repository
      .createQueryBuilder('assignment')
      .where('assignment.eventId = :eventId', { eventId });

    if (!includeRevoked) {
      query.andWhere('assignment.revokedAt IS NULL');
    }

    return this.paginate(query.orderBy('assignment.assignedAt', 'DESC'), page, limit);
  }

  async findActiveByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EventCheckInStaffAssignmentEntity>> {
    const query = this.repository
      .createQueryBuilder('assignment')
      .where('assignment.userId = :userId', { userId })
      .andWhere('assignment.revokedAt IS NULL')
      .orderBy('assignment.assignedAt', 'DESC');

    return this.paginate(query, page, limit);
  }

  async revoke(
    assignment: EventCheckInStaffAssignmentEntity,
  ): Promise<boolean> {
    if (!assignment.revokedAt || !assignment.revokedBy) {
      return false;
    }

    const result = await this.repository.update(
      {
        id: assignment.id,
        eventId: assignment.eventId,
        revokedAt: IsNull(),
      },
      {
        revokedAt: assignment.revokedAt,
        revokedBy: assignment.revokedBy,
        updatedAt: assignment.updatedAt,
      },
    );

    return (result.affected ?? 0) === 1;
  }

  private async paginate(
    query: ReturnType<Repository<EventCheckInStaffAssignmentOrmEntity>['createQueryBuilder']>,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EventCheckInStaffAssignmentEntity>> {
    const [entities, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: entities.map((entity) => this.mapper.toDomain(entity)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}