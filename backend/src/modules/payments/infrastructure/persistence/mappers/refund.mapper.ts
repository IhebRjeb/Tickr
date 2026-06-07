import { Injectable } from '@nestjs/common';

import { RefundEntity } from '../../../domain/entities/refund.entity';
import { RefundStatus } from '../../../domain/value-objects/refund-status.vo';
import { RefundOrmEntity } from '../entities/refund.orm-entity';

/**
 * Refund Mapper
 *
 * Transforms between RefundEntity (domain) and RefundOrmEntity (persistence).
 */
@Injectable()
export class RefundMapper {
  toPersistence(domain: RefundEntity): RefundOrmEntity {
    const entity = new RefundOrmEntity();

    entity.id = domain.id;
    entity.orderId = domain.orderId;
    entity.amountValue = domain.amountValue;
    entity.amountCurrency = domain.amountCurrency;
    entity.reason = domain.reason;
    entity.status = domain.status;
    entity.gatewayRefundId = domain.gatewayRefundId;
    entity.processedAt = domain.processedAt;
    entity.createdAt = domain.createdAt;

    return entity;
  }

  toDomain(raw: RefundOrmEntity): RefundEntity {
    return RefundEntity.reconstitute({
      id: raw.id,
      orderId: raw.orderId,
      amountValue: Number(raw.amountValue),
      amountCurrency: raw.amountCurrency,
      reason: raw.reason,
      status: raw.status as RefundStatus,
      gatewayRefundId: raw.gatewayRefundId,
      processedAt: raw.processedAt,
      createdAt: raw.createdAt,
    });
  }

  toDomainArray(raws: RefundOrmEntity[]): RefundEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }
}
