import { DeepPartial, FindOptionsOrder, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

import {
  IPaginatedRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../application/interfaces/repository.interface';

/**
 * Base TypeORM Repository
 * 
 * Provides common CRUD operations and pagination
 * Maps between Domain entities and TypeORM entities
 */
export abstract class BaseTypeOrmRepository<TDomain, TEntity extends ObjectLiteral>
  implements IPaginatedRepository<TDomain>
{
  constructor(protected readonly repository: Repository<TEntity>) {}

  async findById(id: string): Promise<TDomain | null> {
    const entity = await this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<TEntity>,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async save(domain: TDomain): Promise<TDomain> {
    const entity = this.toEntity(domain);
    const saved = await this.repository.save(entity as DeepPartial<TEntity>);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { id } as unknown as FindOptionsWhere<TEntity>,
    });
    return count > 0;
  }

  async findAll(options?: PaginationOptions): Promise<PaginatedResult<TDomain>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const skip = (page - 1) * limit;

    const order: FindOptionsOrder<TEntity> | undefined = options?.sortBy
      ? ({ [options.sortBy]: options.sortOrder ?? 'ASC' } as FindOptionsOrder<TEntity>)
      : undefined;

    const [entities, total] = await this.repository.findAndCount({
      skip,
      take: limit,
      order,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: entities.map((entity) => this.toDomain(entity)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Map TypeORM entity to Domain entity
   * Must be implemented by each repository
   */
  protected abstract toDomain(entity: TEntity): TDomain;

  /**
   * Map Domain entity to TypeORM entity
   * Must be implemented by each repository
   */
  protected abstract toEntity(domain: TDomain): TEntity;
}
