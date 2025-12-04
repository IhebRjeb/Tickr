import { Injectable } from '@nestjs/common';

import { UserEntityPort } from '../../../application/ports/user.repository.port';
import { UserRole } from '../../../domain/value-objects/user-role.vo';
import { UserEntity } from '../entities/user.orm-entity';

/**
 * User Persistence Mapper
 *
 * Transforms between TypeORM entities and domain/port representations.
 * This mapper is used by the repository to convert data between layers.
 */
@Injectable()
export class UserPersistenceMapper {
  /**
   * Convert TypeORM entity to port entity (used by application layer)
   */
  toDomain(entity: UserEntity): UserEntityPort {
    return {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      role: entity.role,
      phone: entity.phone,
      isActive: entity.isActive,
      lastLoginAt: entity.lastLoginAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Convert port entity to TypeORM entity for persistence
   * Creates a new entity or updates existing fields
   */
  toEntity(domain: Partial<UserEntityPort> & { id?: string }): Partial<UserEntity> {
    const entity: Partial<UserEntity> = {};

    if (domain.id !== undefined) {
      entity.id = domain.id;
    }

    if (domain.email !== undefined) {
      entity.email = domain.email;
    }

    if (domain.firstName !== undefined) {
      entity.firstName = domain.firstName;
    }

    if (domain.lastName !== undefined) {
      entity.lastName = domain.lastName;
    }

    if (domain.role !== undefined) {
      entity.role = domain.role;
    }

    if (domain.phone !== undefined) {
      entity.phone = domain.phone;
    }

    if (domain.isActive !== undefined) {
      entity.isActive = domain.isActive;
    }

    if (domain.lastLoginAt !== undefined) {
      entity.lastLoginAt = domain.lastLoginAt;
    }

    return entity;
  }

  /**
   * Convert array of TypeORM entities to port entities
   */
  toDomainArray(entities: UserEntity[]): UserEntityPort[] {
    return entities.map((entity) => this.toDomain(entity));
  }

  /**
   * Create a new user entity with all required fields
   */
  toNewEntity(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash?: string;
    phone?: string;
    role?: UserRole;
    isOrganizer?: boolean;
  }): Partial<UserEntity> {
    return {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: data.passwordHash ?? null,
      phone: data.phone ?? null,
      role: data.role ?? UserRole.PARTICIPANT,
      isOrganizer: data.isOrganizer ?? false,
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
      lastLoginAt: null,
    };
  }
}
