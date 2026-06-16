import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import type { PlatformAnalyticsRepositoryPort } from '../../application/ports/platform-analytics.repository.port';
import { PlatformAnalyticsEntity } from '../../domain/entities/platform-analytics.entity';
import { PlatformAnalyticsOrmEntity } from '../persistence/entities/platform-analytics.orm-entity';
import { PlatformAnalyticsPersistenceMapper } from '../persistence/mappers/platform-analytics-persistence.mapper';

/**
 * TypeORM implementation of PlatformAnalyticsRepositoryPort
 */
@Injectable()
export class PlatformAnalyticsTypeOrmRepository implements PlatformAnalyticsRepositoryPort {
  private readonly logger = new Logger(PlatformAnalyticsTypeOrmRepository.name);

  constructor(
    @InjectRepository(PlatformAnalyticsOrmEntity)
    private readonly repository: Repository<PlatformAnalyticsOrmEntity>,
    private readonly mapper: PlatformAnalyticsPersistenceMapper,
  ) {}

  async save(entity: PlatformAnalyticsEntity): Promise<PlatformAnalyticsEntity> {
    const ormEntity = this.mapper.toPersistence(entity);
    const saved = await this.repository.save(ormEntity);
    return this.mapper.toDomain(saved);
  }

  async findByPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<PlatformAnalyticsEntity | null> {
    const entity = await this.repository.findOne({
      where: {
        periodStart: Between(startDate, endDate),
      },
      order: { periodStart: 'DESC' },
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findLatest(): Promise<PlatformAnalyticsEntity | null> {
    const entity = await this.repository.findOne({
      order: { periodEnd: 'DESC' },
      where: {},
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: PlatformAnalyticsEntity[]; total: number }> {
    const [entities, total] = await this.repository.findAndCount({
      order: { periodStart: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }
}
