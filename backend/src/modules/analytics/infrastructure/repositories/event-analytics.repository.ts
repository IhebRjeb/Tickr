import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { EventAnalyticsRepositoryPort } from '../../application/ports/event-analytics.repository.port';
import { EventAnalyticsEntity } from '../../domain/entities/event-analytics.entity';
import { EventAnalyticsOrmEntity } from '../persistence/entities/event-analytics.orm-entity';
import { EventAnalyticsPersistenceMapper } from '../persistence/mappers/event-analytics-persistence.mapper';

/**
 * TypeORM implementation of EventAnalyticsRepositoryPort
 */
@Injectable()
export class EventAnalyticsTypeOrmRepository implements EventAnalyticsRepositoryPort {
  private readonly logger = new Logger(EventAnalyticsTypeOrmRepository.name);

  constructor(
    @InjectRepository(EventAnalyticsOrmEntity)
    private readonly repository: Repository<EventAnalyticsOrmEntity>,
    private readonly mapper: EventAnalyticsPersistenceMapper,
  ) {}

  async save(entity: EventAnalyticsEntity): Promise<EventAnalyticsEntity> {
    const ormEntity = this.mapper.toPersistence(entity);
    const saved = await this.repository.save(ormEntity);
    return this.mapper.toDomain(saved);
  }

  async findByEventId(eventId: string): Promise<EventAnalyticsEntity | null> {
    const entity = await this.repository.findOne({ where: { eventId } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByOrganizerId(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<{ data: EventAnalyticsEntity[]; total: number }> {
    // Note: organizerId filtering requires a join or separate tracking.
    // For now, we query all and filter (in production, add organizer_id column or join).
    const [entities, total] = await this.repository.findAndCount({
      order: { lastUpdated: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async deleteByEventId(eventId: string): Promise<void> {
    await this.repository.delete({ eventId });
  }
}
