import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginatedResult } from '@shared/application/interfaces/repository.interface';
import { Repository } from 'typeorm';

import type { EventCheckInAccessListItem } from '../../application/models/event-check-in-access.model';
import type { EventCheckInAccessReadPort } from '../../application/ports/event-check-in-access-read.port';
import { EventCheckInStaffAssignmentOrmEntity } from '../persistence/entities/event-check-in-staff-assignment.orm-entity';
import { EventOrmEntity } from '../persistence/entities/event.orm-entity';

@Injectable()
export class EventCheckInAccessReadTypeOrmRepository
  implements EventCheckInAccessReadPort
{
  constructor(
    @InjectRepository(EventOrmEntity)
    private readonly eventRepository: Repository<EventOrmEntity>,
  ) {}

  async findAccessibleEvents(
    userId: string,
    isAdmin: boolean,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EventCheckInAccessListItem>> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoin(
        EventCheckInStaffAssignmentOrmEntity,
        'assignment',
        'assignment.eventId = event.id AND assignment.userId = :userId AND assignment.revokedAt IS NULL',
        { userId },
      )
      .where('event.status = :status', { status: 'PUBLISHED' })
      .andWhere('event.endDate >= :now', { now: new Date() });

    if (!isAdmin) {
      query.andWhere(
        '(event.organizerId = :userId OR assignment.id IS NOT NULL)',
        { userId },
      );
    }

    const total = await query.getCount();
    const rows = await query
      .select([
        'event.id AS "eventId"',
        'event.title AS "title"',
        'event.status AS "status"',
        'event.startDate AS "startDate"',
        'event.endDate AS "endDate"',
        'event.organizerId AS "organizerId"',
        'assignment.id AS "assignmentId"',
      ])
      .orderBy('event.startDate', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{
        eventId: string;
        title: string;
        status: string;
        startDate: Date;
        endDate: Date;
        organizerId: string;
        assignmentId: string | null;
      }>();
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows.map((row) => ({
        eventId: row.eventId,
        title: row.title,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        authorizationSource: isAdmin
          ? 'ADMIN'
          : row.organizerId === userId
            ? 'OWNER'
            : 'ASSIGNMENT',
        assignmentId: row.assignmentId,
      })),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}