import { Injectable } from '@nestjs/common';

import { TicketEntity } from '../../../domain/entities/ticket.entity';
import { QRCodeVO } from '../../../domain/value-objects/qr-code.vo';
import { TicketStatus } from '../../../domain/value-objects/ticket-status.vo';
import { TicketOrmEntity } from '../entities/ticket.orm-entity';

/**
 * Ticket Mapper
 *
 * Transforms between domain entities (TicketEntity) and
 * persistence entities (TicketOrmEntity).
 *
 * Responsibilities:
 * - Convert domain value objects (QRCodeVO, TicketStatus) to primitive columns
 * - Convert primitive columns to domain value objects
 * - Handle all nullable fields correctly
 * - Preserve all data during conversions
 */
@Injectable()
export class TicketMapper {
  /**
   * Convert domain entity to persistence entity
   *
   * @param domain - Domain TicketEntity
   * @returns TypeORM entity ready for persistence
   */
  toPersistence(domain: TicketEntity): TicketOrmEntity {
    const entity = new TicketOrmEntity();

    entity.id = domain.id;
    entity.eventId = domain.eventId;
    entity.ticketTypeId = domain.ticketTypeId;
    entity.orderId = domain.orderId;
    entity.userId = domain.userId;
    entity.qrCode = domain.qrCode.value;
    entity.status = domain.status;
    entity.priceAmount = domain.priceAmount;
    entity.priceCurrency = domain.priceCurrency;
    entity.holderName = domain.holderName;
    entity.holderEmail = domain.holderEmail;
    entity.holderPhone = domain.holderPhone;
    entity.checkedInAt = domain.checkedInAt;
    entity.checkedInBy = domain.checkedInBy;
    entity.transferredTo = domain.transferredTo;
    entity.transferredAt = domain.transferredAt;
    entity.transferCount = domain.transferCount;
    entity.reservedUntil = domain.reservedUntil;
    entity.pdfUrl = domain.pdfUrl;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;

    return entity;
  }

  /**
   * Convert persistence entity to domain entity
   *
   * @param raw - TypeORM entity from database
   * @returns Domain TicketEntity
   */
  toDomain(raw: TicketOrmEntity): TicketEntity {
    const qrCode = QRCodeVO.fromString(raw.qrCode);

    return TicketEntity.reconstitute({
      id: raw.id,
      eventId: raw.eventId,
      ticketTypeId: raw.ticketTypeId,
      orderId: raw.orderId,
      userId: raw.userId,
      qrCode,
      status: raw.status as TicketStatus,
      priceAmount: Number(raw.priceAmount),
      priceCurrency: raw.priceCurrency,
      holderName: raw.holderName,
      holderEmail: raw.holderEmail,
      holderPhone: raw.holderPhone,
      checkedInAt: raw.checkedInAt,
      checkedInBy: raw.checkedInBy,
      transferredTo: raw.transferredTo,
      transferredAt: raw.transferredAt,
      transferCount: raw.transferCount,
      reservedUntil: raw.reservedUntil,
      pdfUrl: raw.pdfUrl,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convert array of persistence entities to domain entities
   *
   * @param raws - Array of TypeORM entities
   * @returns Array of domain entities
   */
  toDomainArray(raws: TicketOrmEntity[]): TicketEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }

  /**
   * Update existing ORM entity with domain entity data
   * Preserves the ORM entity instance for TypeORM change detection
   *
   * @param target - Existing TypeORM entity to update
   * @param source - Domain entity with new data
   * @returns Updated TypeORM entity (same instance)
   */
  updatePersistence(target: TicketOrmEntity, source: TicketEntity): TicketOrmEntity {
    target.orderId = source.orderId;
    target.userId = source.userId;
    target.qrCode = source.qrCode.value;
    target.status = source.status;
    target.holderName = source.holderName;
    target.holderEmail = source.holderEmail;
    target.holderPhone = source.holderPhone;
    target.checkedInAt = source.checkedInAt;
    target.checkedInBy = source.checkedInBy;
    target.transferredTo = source.transferredTo;
    target.transferredAt = source.transferredAt;
    target.transferCount = source.transferCount;
    target.reservedUntil = source.reservedUntil;
    target.pdfUrl = source.pdfUrl;
    target.updatedAt = source.updatedAt;

    return target;
  }
}
