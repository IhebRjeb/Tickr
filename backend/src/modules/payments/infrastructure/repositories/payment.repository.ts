import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaymentRepositoryPort } from '../../application/ports/payment.repository.port';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { PaymentOrmEntity } from '../persistence/entities/payment.orm-entity';
import { PaymentMapper } from '../persistence/mappers/payment.mapper';

/**
 * Payment TypeORM Repository
 *
 * Implements PaymentRepositoryPort using TypeORM.
 */
@Injectable()
export class PaymentTypeOrmRepository implements PaymentRepositoryPort {
  constructor(
    @InjectRepository(PaymentOrmEntity)
    private readonly repository: Repository<PaymentOrmEntity>,
    private readonly mapper: PaymentMapper,
  ) {}

  async save(payment: PaymentEntity): Promise<PaymentEntity> {
    const ormEntity = this.mapper.toPersistence(payment);
    const saved = await this.repository.save(ormEntity);
    return this.mapper.toDomain(saved);
  }

  async findByOrderId(orderId: string): Promise<PaymentEntity[]> {
    const entities = await this.repository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    return this.mapper.toDomainArray(entities);
  }

  async countByOrderId(orderId: string): Promise<number> {
    return this.repository.count({ where: { orderId } });
  }
}
