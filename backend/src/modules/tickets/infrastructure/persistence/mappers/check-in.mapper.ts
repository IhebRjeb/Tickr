import { Injectable } from '@nestjs/common';

import { CheckInEntity } from '../../../domain/entities/check-in.entity';
import { CheckInOrmEntity } from '../entities/check-in.orm-entity';

/**
 * Check-In Mapper
 *
 * Transforms between domain entities (CheckInEntity) and
 * persistence entities (CheckInOrmEntity).
 */
@Injectable()
export class CheckInMapper {
  /**
   * Convert domain entity to persistence entity
   *
   * @param domain - Domain CheckInEntity
   * @returns TypeORM entity ready for persistence
   */
  toPersistence(domain: CheckInEntity): CheckInOrmEntity {
    const entity = new CheckInOrmEntity();

    entity.id = domain.id;
    entity.ticketId = domain.ticketId;
    entity.eventId = domain.eventId;
    entity.staffId = domain.staffId;
    entity.deviceId = domain.deviceId;
    entity.timestamp = domain.timestamp;
    entity.locationGate = domain.locationGate;
    entity.isValid = domain.isValid;
    entity.failureReason = domain.failureReason;
    entity.createdAt = domain.createdAt;

    return entity;
  }

  /**
   * Convert persistence entity to domain entity
   *
   * @param raw - TypeORM entity from database
   * @returns Domain CheckInEntity
   */
  toDomain(raw: CheckInOrmEntity): CheckInEntity {
    return CheckInEntity.reconstitute({
      id: raw.id,
      ticketId: raw.ticketId,
      eventId: raw.eventId,
      staffId: raw.staffId,
      deviceId: raw.deviceId,
      locationGate: raw.locationGate ?? '',
      timestamp: raw.timestamp,
      isValid: raw.isValid,
      failureReason: raw.failureReason,
      createdAt: raw.createdAt,
    });
  }

  /**
   * Convert array of persistence entities to domain entities
   *
   * @param raws - Array of TypeORM entities
   * @returns Array of domain entities
   */
  toDomainArray(raws: CheckInOrmEntity[]): CheckInEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }
}
