import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResult, PaginationOptions } from '@shared/application/interfaces/repository.interface';
import { BaseTypeOrmRepository } from '@shared/infrastructure/database/base-typeorm.repository';
import { Repository } from 'typeorm';

import { UserEntityPort, UserRepositoryPort, UserWithPasswordPort } from '../../../application/ports/user.repository.port';
import { UserRole } from '../../../domain/value-objects/user-role.vo';
import { UserEntity } from '../entities/user.orm-entity';
import { UserPersistenceMapper } from '../mappers/user-persistence.mapper';

/**
 * User TypeORM Repository
 *
 * Implements the UserRepositoryPort using TypeORM.
 * This is the infrastructure layer implementation of the repository pattern.
 */
@Injectable()
export class UserTypeOrmRepository
  extends BaseTypeOrmRepository<UserEntityPort, UserEntity>
  implements UserRepositoryPort
{
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
    private readonly mapper: UserPersistenceMapper,
  ) {
    super(repository);
  }

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<UserEntityPort | null> {
    const entity = await this.repository.findOne({
      where: { email: email.toLowerCase() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Find user by email with password hash (for authentication)
   */
  async findByEmailWithPassword(email: string): Promise<UserWithPasswordPort | null> {
    const entity = await this.repository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!entity) return null;

    return {
      ...this.toDomain(entity),
      passwordHash: entity.passwordHash,
      emailVerified: entity.emailVerified,
    };
  }

  /**
   * Find users by role with pagination
   */
  async findByRole(
    role: UserRole,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<UserEntityPort>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const skip = (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      where: { role },
      skip,
      take: limit,
      order: {
        [options?.sortBy ?? 'createdAt']: options?.sortOrder ?? 'DESC',
      },
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

  /**
   * Check if email already exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  /**
   * Count users by role
   */
  async countByRole(role: UserRole): Promise<number> {
    return this.repository.count({
      where: { role },
    });
  }

  /**
   * Find active users with pagination
   */
  async findActiveUsers(
    options?: PaginationOptions,
  ): Promise<PaginatedResult<UserEntityPort>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const skip = (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      where: { isActive: true },
      skip,
      take: limit,
      order: {
        [options?.sortBy ?? 'createdAt']: options?.sortOrder ?? 'DESC',
      },
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

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.repository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Update user's email verified status
   */
  async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
    await this.repository.update(userId, {
      emailVerified: verified,
    });
  }

  /**
   * Update user's password hash
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.repository.update(userId, {
      passwordHash,
      updatedAt: new Date(),
    });
  }

  /**
   * Find user by phone number
   */
  async findByPhone(phone: string): Promise<UserEntityPort | null> {
    const entity = await this.repository.findOne({
      where: { phone },
    });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Check if phone already exists
   */
  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { phone },
    });
    return count > 0;
  }

  /**
   * Map TypeORM entity to domain entity
   */
  protected toDomain(entity: UserEntity): UserEntityPort {
    return this.mapper.toDomain(entity);
  }

  /**
   * Map domain entity to TypeORM entity
   */
  protected toEntity(domain: UserEntityPort): UserEntity {
    const entity = new UserEntity();
    entity.id = domain.id;
    entity.email = domain.email;
    entity.firstName = domain.firstName;
    entity.lastName = domain.lastName;
    entity.role = domain.role;
    entity.phone = domain.phone;
    entity.isActive = domain.isActive;
    entity.lastLoginAt = domain.lastLoginAt;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    if (domain.passwordHash) {
      entity.passwordHash = domain.passwordHash;
    }
    return entity;
  }
}
