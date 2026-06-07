import { OrderEntity } from '../../domain/entities/order.entity';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepositoryPort {
  save(order: OrderEntity): Promise<OrderEntity>;
  findById(id: string): Promise<OrderEntity | null>;
  findByUserId(userId: string, page: number, limit: number): Promise<{ data: OrderEntity[]; total: number }>;
  findByEventId(eventId: string, page: number, limit: number): Promise<{ data: OrderEntity[]; total: number }>;
  findExpired(): Promise<OrderEntity[]>;
  countByUserIdSince(userId: string, since: Date): Promise<number>;
}
