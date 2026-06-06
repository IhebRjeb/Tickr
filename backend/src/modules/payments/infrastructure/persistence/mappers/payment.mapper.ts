import { Injectable } from '@nestjs/common';

import { PaymentEntity } from '../../../domain/entities/payment.entity';
import { PaymentMethod } from '../../../domain/value-objects/payment-method.vo';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.vo';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';

/**
 * Payment Mapper
 *
 * Transforms between PaymentEntity (domain) and PaymentOrmEntity (persistence).
 */
@Injectable()
export class PaymentMapper {
  toPersistence(domain: PaymentEntity): PaymentOrmEntity {
    const entity = new PaymentOrmEntity();

    entity.id = domain.id;
    entity.orderId = domain.orderId;
    entity.amountValue = domain.amountValue;
    entity.amountCurrency = domain.amountCurrency;
    entity.provider = domain.provider;
    entity.status = domain.status;
    entity.gatewayResponse = domain.gatewayResponse;
    entity.gatewayPaymentRef = domain.gatewayPaymentRef;
    entity.errorCode = domain.errorCode;
    entity.errorMessage = domain.errorMessage;
    entity.attemptNumber = domain.attemptNumber;
    entity.createdAt = domain.createdAt;

    return entity;
  }

  toDomain(raw: PaymentOrmEntity): PaymentEntity {
    return PaymentEntity.reconstitute({
      id: raw.id,
      orderId: raw.orderId,
      amountValue: Number(raw.amountValue),
      amountCurrency: raw.amountCurrency,
      provider: raw.provider as PaymentMethod,
      status: raw.status as PaymentStatus,
      gatewayResponse: raw.gatewayResponse,
      gatewayPaymentRef: raw.gatewayPaymentRef,
      errorCode: raw.errorCode,
      errorMessage: raw.errorMessage,
      attemptNumber: raw.attemptNumber,
      createdAt: raw.createdAt,
    });
  }

  toDomainArray(raws: PaymentOrmEntity[]): PaymentEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }
}
