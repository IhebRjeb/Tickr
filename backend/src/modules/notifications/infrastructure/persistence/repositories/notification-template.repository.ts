import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationTemplateRepositoryPort } from '../../../application/ports/notification-template.repository.port';
import { NotificationTemplateEntity } from '../../../domain/entities/notification-template.entity';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationTemplateOrmEntity } from '../entities/notification-template.orm-entity';
import { NotificationTemplatePersistenceMapper } from '../mappers/notification-template-persistence.mapper';

/**
 * NotificationTemplate TypeORM Repository
 */
@Injectable()
export class NotificationTemplateTypeOrmRepository
  implements NotificationTemplateRepositoryPort
{
  constructor(
    @InjectRepository(NotificationTemplateOrmEntity)
    private readonly repository: Repository<NotificationTemplateOrmEntity>,
    private readonly mapper: NotificationTemplatePersistenceMapper,
  ) {}

  async findById(
    id: string,
  ): Promise<NotificationTemplateEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async save(
    domain: NotificationTemplateEntity,
  ): Promise<NotificationTemplateEntity> {
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

  async findBySlug(
    slug: string,
  ): Promise<NotificationTemplateEntity | null> {
    const entity = await this.repository.findOne({
      where: { slug, isActive: true },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByChannel(
    channel: NotificationChannel,
  ): Promise<NotificationTemplateEntity[]> {
    const entities = await this.repository.find({
      where: { channel, isActive: true },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findActive(): Promise<NotificationTemplateEntity[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }
}
