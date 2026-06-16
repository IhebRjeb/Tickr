import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import type { MetricRepositoryPort, AggregateOptions, MetricAggregation } from '../../application/ports/metric.repository.port';
import { MetricEntity } from '../../domain/entities/metric.entity';
import type { EntityType } from '../../domain/value-objects/entity-type.vo';
import type { MetricType } from '../../domain/value-objects/metric-type.vo';
import { MetricOrmEntity } from '../persistence/entities/metric.orm-entity';
import { MetricPersistenceMapper } from '../persistence/mappers/metric-persistence.mapper';

/**
 * TypeORM implementation of MetricRepositoryPort
 */
@Injectable()
export class MetricTypeOrmRepository implements MetricRepositoryPort {
  private readonly logger = new Logger(MetricTypeOrmRepository.name);

  constructor(
    @InjectRepository(MetricOrmEntity)
    private readonly repository: Repository<MetricOrmEntity>,
    private readonly mapper: MetricPersistenceMapper,
  ) {}

  async save(metric: MetricEntity): Promise<MetricEntity> {
    const ormEntity = this.mapper.toPersistence(metric);
    const saved = await this.repository.save(ormEntity);
    return this.mapper.toDomain(saved);
  }

  async findById(id: string): Promise<MetricEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.repository.existsBy({ id });
  }

  async findByEntityId(
    entityId: string,
    page: number,
    limit: number,
  ): Promise<{ data: MetricEntity[]; total: number }> {
    const [entities, total] = await this.repository.findAndCount({
      where: { entityId },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async findByType(
    metricType: MetricType,
    startDate: Date,
    endDate: Date,
  ): Promise<MetricEntity[]> {
    const entities = await this.repository.find({
      where: {
        metricType,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    return this.mapper.toDomainArray(entities);
  }

  async findByEntityAndType(
    entityId: string,
    metricType: MetricType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MetricEntity[]> {
    const qb = this.repository
      .createQueryBuilder('m')
      .where('m.entity_id = :entityId', { entityId })
      .andWhere('m.metric_type = :metricType', { metricType });

    if (startDate && endDate) {
      qb.andWhere('m.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    qb.orderBy('m.timestamp', 'ASC');

    const entities = await qb.getMany();
    return this.mapper.toDomainArray(entities);
  }

  async aggregate(options: AggregateOptions): Promise<MetricAggregation[]> {
    const qb = this.repository
      .createQueryBuilder('m')
      .select('m.metric_type', 'metricType')
      .addSelect('m.entity_id', 'entityId')
      .addSelect('SUM(m.value)', 'sum')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(m.value)', 'avg')
      .addSelect('MIN(m.value)', 'min')
      .addSelect('MAX(m.value)', 'max')
      .where('m.timestamp BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });

    if (options.metricType) {
      qb.andWhere('m.metric_type = :metricType', { metricType: options.metricType });
    }

    if (options.entityType) {
      qb.andWhere('m.entity_type = :entityType', { entityType: options.entityType });
    }

    if (options.entityId) {
      qb.andWhere('m.entity_id = :entityId', { entityId: options.entityId });
    }

    qb.groupBy('m.metric_type').addGroupBy('m.entity_id');

    const results = await qb.getRawMany();

    return results.map((r) => ({
      metricType: r.metricType as MetricType,
      entityId: r.entityId as string,
      sum: Number(r.sum),
      count: Number(r.count),
      avg: Number(r.avg),
      min: Number(r.min),
      max: Number(r.max),
    }));
  }

  async sumByEntityAndType(
    entityId: string,
    metricType: MetricType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.value), 0)', 'total')
      .where('m.entity_id = :entityId', { entityId })
      .andWhere('m.metric_type = :metricType', { metricType });

    if (startDate && endDate) {
      qb.andWhere('m.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const result = await qb.getRawOne();
    return Number(result?.total ?? 0);
  }

  async countByEntityAndType(
    entityId: string,
    metricType: MetricType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.value), 0)', 'total')
      .where('m.entity_id = :entityId', { entityId })
      .andWhere('m.metric_type = :metricType', { metricType });

    if (startDate && endDate) {
      qb.andWhere('m.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const result = await qb.getRawOne();
    return Number(result?.total ?? 0);
  }
}
