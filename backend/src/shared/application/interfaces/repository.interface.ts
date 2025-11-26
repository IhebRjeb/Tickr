/**
 * Base Repository Port
 *
 * Defines the contract for all repositories
 * Implementations are in infrastructure layer
 */

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface IPaginatedRepository<T> extends IRepository<T> {
  findAll(options?: PaginationOptions): Promise<PaginatedResult<T>>;
  count(): Promise<number>;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
