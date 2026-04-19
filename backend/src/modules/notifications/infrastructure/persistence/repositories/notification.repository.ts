import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationRepositoryPort } from '../../../application/ports/notification.repository.port';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationStatus } from '../../../domain/value-objects/notification-status.vo';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';
import { NotificationPersistenceMapper } from '../mappers/notification-persistence.mapper';

/**
 * Notification TypeORM Repository
 */
@Injectable()
export class NotificationTypeOrmRepository
  implements NotificationRepositoryPort
{
  private readonly logger = new Logger(NotificationTypeOrmRepository.name);

  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repository: Repository<NotificationOrmEntity>,
    private readonly mapper: NotificationPersistenceMapper,
  ) {}

  async findById(id: string): Promise<NotificationEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async save(domain: NotificationEntity): Promise<NotificationEntity> {
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

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: NotificationEntity[]; total: number }> {
    const [entities, total] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async findByStatus(
    status: NotificationStatus,
    limit: number,
  ): Promise<NotificationEntity[]> {
    const entities = await this.repository.find({
      where: { status },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return this.mapper.toDomainArray(entities);
  }

  async findReadyToSend(limit: number): Promise<NotificationEntity[]> {
    const now = new Date();
    const entities = await this.repository
      .createQueryBuilder('n')
      .where('n.status = :status', { status: NotificationStatus.PENDING })
      .andWhere(
        '(n.scheduled_for IS NULL OR n.scheduled_for <= :now)',
        { now },
      )
      .orderBy('n.created_at', 'ASC')
      .take(limit)
      .getMany();

    return this.mapper.toDomainArray(entities);
  }

  async findFailedRetryable(
    limit: number,
  ): Promise<NotificationEntity[]> {
    const entities = await this.repository
      .createQueryBuilder('n')
      .where('n.status = :status', { status: NotificationStatus.FAILED })
      .andWhere('n.retry_count < n.max_retries')
      .orderBy('n.updated_at', 'ASC')
      .take(limit)
      .getMany();

    return this.mapper.toDomainArray(entities);
  }

  async countByUserSince(userId: string, since: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.created_at >= :since', { since })
      .getCount();
  }

  async countByStatusSince(
    status: NotificationStatus,
    since: Date,
  ): Promise<number> {
    return this.repository
      .createQueryBuilder('n')
      .where('n.status = :status', { status })
      .andWhere('n.created_at >= :since', { since })
      .getCount();
  }
}
