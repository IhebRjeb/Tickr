import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationPreferenceRepositoryPort } from '../../../application/ports/notification-preference.repository.port';
import { NotificationPreferenceEntity } from '../../../domain/entities/notification-preference.entity';
import { NotificationPreferenceOrmEntity } from '../entities/notification-preference.orm-entity';
import { NotificationPreferencePersistenceMapper } from '../mappers/notification-preference-persistence.mapper';

/**
 * NotificationPreference TypeORM Repository
 */
@Injectable()
export class NotificationPreferenceTypeOrmRepository
  implements NotificationPreferenceRepositoryPort
{
  constructor(
    @InjectRepository(NotificationPreferenceOrmEntity)
    private readonly repository: Repository<NotificationPreferenceOrmEntity>,
    private readonly mapper: NotificationPreferencePersistenceMapper,
  ) {}

  async findById(
    id: string,
  ): Promise<NotificationPreferenceEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async save(
    domain: NotificationPreferenceEntity,
  ): Promise<NotificationPreferenceEntity> {
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
  ): Promise<NotificationPreferenceEntity | null> {
    const entity = await this.repository.findOne({
      where: { userId },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUnsubscribeToken(
    token: string,
  ): Promise<NotificationPreferenceEntity | null> {
    const entity = await this.repository.findOne({
      where: { unsubscribeToken: token },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }
}
