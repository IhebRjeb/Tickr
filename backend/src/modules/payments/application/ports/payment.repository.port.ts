import { PaymentEntity } from '../../domain/entities/payment.entity';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface PaymentRepositoryPort {
  save(payment: PaymentEntity): Promise<PaymentEntity>;
  findByOrderId(orderId: string): Promise<PaymentEntity[]>;
  countByOrderId(orderId: string): Promise<number>;
}
