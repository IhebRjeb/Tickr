import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CheckInRepositoryPort } from '../../../application/ports/check-in.repository.port';
import { CheckInEntity } from '../../../domain/entities/check-in.entity';
import { CheckInOrmEntity } from '../entities/check-in.orm-entity';
import { CheckInMapper } from '../mappers/check-in.mapper';

/**
 * Check-In TypeORM Repository
 *
 * Implements the CheckInRepositoryPort using TypeORM.
 * Provides persistence operations for check-in audit records.
 */
@Injectable()
export class CheckInTypeOrmRepository implements CheckInRepositoryPort {
  private readonly logger = new Logger(CheckInTypeOrmRepository.name);

  constructor(
    @InjectRepository(CheckInOrmEntity)
    private readonly repository: Repository<CheckInOrmEntity>,
    private readonly mapper: CheckInMapper,
  ) {}

  // ============================================
  // Base CRUD Operations
  // ============================================

  async findById(id: string): Promise<CheckInEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return this.mapper.toDomain(entity);
  }

  async save(domain: CheckInEntity): Promise<CheckInEntity> {
    const ormEntity = this.mapper.toPersistence(domain);
    const saved = await this.repository.save(ormEntity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  // ============================================
  // Query Methods
  // ============================================

  async findByTicketId(ticketId: string): Promise<CheckInEntity[]> {
    const entities = await this.repository.find({
      where: { ticketId },
      order: { timestamp: 'DESC' },
    });

    return this.mapper.toDomainArray(entities);
  }

  async findByEventId(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<{ data: CheckInEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      where: { eventId },
      order: { timestamp: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  // ============================================
  // Count Methods
  // ============================================

  async countByEventId(eventId: string): Promise<number> {
    return this.repository.count({ where: { eventId } });
  }
}
