import { RefundEntity } from '../../domain/entities/refund.entity';

export const REFUND_REPOSITORY = Symbol('REFUND_REPOSITORY');

export interface RefundRepositoryPort {
  save(refund: RefundEntity): Promise<RefundEntity>;
  findByOrderId(orderId: string): Promise<RefundEntity[]>;
}
