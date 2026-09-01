import { Injectable } from '@nestjs/common';

import { EventEntity } from '../../../domain/entities/event.entity';
import { Currency } from '../../../domain/value-objects/currency.vo';
import { EventCategory } from '../../../domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '../../../domain/value-objects/event-date-range.vo';
import { EventStatus } from '../../../domain/value-objects/event-status.vo';
import { LocationVO } from '../../../domain/value-objects/location.vo';
import { EventOrmEntity } from '../entities/event.orm-entity';

import { TicketTypeMapper } from './ticket-type.mapper';

/**
 * Event Mapper
 *
 * Transforms between domain entities (EventEntity) and
 * persistence entities (EventOrmEntity).
 *
 * Responsibilities:
 * - Convert domain value objects to primitive columns
 * - Convert primitive columns to domain value objects
 * - Handle nested TicketType conversions
 * - Preserve all data during conversions
 *
 * Note: Injected with TicketTypeMapper for nested conversions.
 */
@Injectable()
export class EventMapper {
  constructor(private readonly ticketTypeMapper: TicketTypeMapper) {}

  /**
   * Convert domain entity to persistence entity
   *
   * @param domain - Domain EventEntity
   * @returns TypeORM entity ready for persistence
   */
  toPersistence(domain: EventEntity): EventOrmEntity {
    const entity = new EventOrmEntity();

    // Core fields
    entity.id = domain.id;
    entity.organizerId = domain.organizerId;
    entity.title = domain.title;
    entity.description = domain.description;
    entity.category = domain.category;
    entity.status = domain.status;
    entity.imageUrl = domain.imageUrl;
    entity.commissionRateOverride = domain.commissionRateOverride;

    // Location fields (embedded value object)
    entity.locationAddress = domain.location.address ?? null;
    entity.locationCity = domain.location.city;
    entity.locationCountry = domain.location.country;
    entity.locationPostalCode = domain.location.postalCode ?? null;
    entity.locationLat = domain.location.latitude ?? null;
    entity.locationLng = domain.location.longitude ?? null;

    // Date fields (embedded value object)
    entity.startDate = domain.dateRange.startDate;
    entity.endDate = domain.dateRange.endDate;
    entity.isMultiDay = domain.dateRange.isMultiDay;

    // Capacity and revenue
    entity.totalCapacity = domain.totalCapacity;
    entity.soldTickets = domain.soldTickets;
    entity.revenueAmount = domain.getTotalRevenueAmount();
    entity.revenueCurrency = domain.getRevenueCurrency();

    // Timestamps
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.publishedAt = domain.publishedAt;
    entity.cancelledAt = domain.cancelledAt;
    entity.cancellationReason = domain.cancellationReason;

    // Nested ticket types
    entity.ticketTypes = this.ticketTypeMapper.toPersistenceArray(
      [...domain.ticketTypes],
    );

    return entity;
  }

  /**
   * Convert persistence entity to domain entity
   *
   * @param raw - TypeORM entity from database
   * @returns Domain EventEntity
   */
  toDomain(raw: EventOrmEntity): EventEntity {
    // Create Location value object
    const location = LocationVO.create({
      address: raw.locationAddress ?? undefined,
      city: raw.locationCity,
      country: raw.locationCountry,
      postalCode: raw.locationPostalCode ?? undefined,
      latitude: raw.locationLat ? Number(raw.locationLat) : undefined,
      longitude: raw.locationLng ? Number(raw.locationLng) : undefined,
    });

    // Create DateRange value object
    const dateRange = EventDateRangeVO.create(
      raw.startDate,
      raw.endDate,
      raw.isMultiDay,
    );

    // Convert ticket types if loaded
    const ticketTypes = raw.ticketTypes
      ? this.ticketTypeMapper.toDomainArray(raw.ticketTypes)
      : [];

    // Use reconstitute method to create entity from persisted data
    return EventEntity.reconstitute({
      id: raw.id,
      organizerId: raw.organizerId,
      title: raw.title,
      description: raw.description,
      category: raw.category as EventCategory,
      location,
      dateRange,
      imageUrl: raw.imageUrl,
      commissionRateOverride:
        raw.commissionRateOverride === null
          ? null
          : Number(raw.commissionRateOverride),
      status: raw.status as EventStatus,
      ticketTypes,
      totalCapacity: raw.totalCapacity,
      soldTickets: raw.soldTickets,
      revenueAmount: Number(raw.revenueAmount),
      revenueCurrency: raw.revenueCurrency as Currency,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      publishedAt: raw.publishedAt,
      cancelledAt: raw.cancelledAt,
      cancellationReason: raw.cancellationReason,
    });
  }

  /**
   * Convert array of persistence entities to domain entities
   *
   * @param raws - Array of TypeORM entities
   * @returns Array of domain entities
   */
  toDomainArray(raws: EventOrmEntity[]): EventEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }

  /**
   * Convert persistence entity to domain entity without loading ticket types
   * Used for list views where ticket types are not needed
   *
   * @param raw - TypeORM entity from database (without ticketTypes loaded)
   * @returns Domain EventEntity with empty ticketTypes
   */
  toDomainWithoutTicketTypes(raw: EventOrmEntity): EventEntity {
    // Create Location value object
    const location = LocationVO.create({
      address: raw.locationAddress ?? undefined,
      city: raw.locationCity,
      country: raw.locationCountry,
      postalCode: raw.locationPostalCode ?? undefined,
      latitude: raw.locationLat ? Number(raw.locationLat) : undefined,
      longitude: raw.locationLng ? Number(raw.locationLng) : undefined,
    });

    // Create DateRange value object
    const dateRange = EventDateRangeVO.create(
      raw.startDate,
      raw.endDate,
      raw.isMultiDay,
    );

    // Use reconstitute with empty ticketTypes
    return EventEntity.reconstitute({
      id: raw.id,
      organizerId: raw.organizerId,
      title: raw.title,
      description: raw.description,
      category: raw.category as EventCategory,
      location,
      dateRange,
      imageUrl: raw.imageUrl,
      commissionRateOverride:
        raw.commissionRateOverride === null
          ? null
          : Number(raw.commissionRateOverride),
      status: raw.status as EventStatus,
      ticketTypes: [],
      totalCapacity: raw.totalCapacity,
      soldTickets: raw.soldTickets,
      revenueAmount: Number(raw.revenueAmount),
      revenueCurrency: raw.revenueCurrency as Currency,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      publishedAt: raw.publishedAt,
      cancelledAt: raw.cancelledAt,
      cancellationReason: raw.cancellationReason,
    });
  }

  /**
   * Update existing ORM entity with domain entity data
   * Preserves the ORM entity instance for TypeORM change detection
   *
   * @param target - Existing TypeORM entity to update
   * @param source - Domain entity with new data
   * @returns Updated TypeORM entity (same instance)
   */
  updatePersistence(target: EventOrmEntity, source: EventEntity): EventOrmEntity {
    // Core fields
    target.title = source.title;
    target.description = source.description;
    target.category = source.category;
    target.status = source.status;
    target.imageUrl = source.imageUrl;
    target.commissionRateOverride = source.commissionRateOverride;

    // Location fields
    target.locationAddress = source.location.address ?? null;
    target.locationCity = source.location.city;
    target.locationCountry = source.location.country;
    target.locationPostalCode = source.location.postalCode ?? null;
    target.locationLat = source.location.latitude ?? null;
    target.locationLng = source.location.longitude ?? null;

    // Date fields
    target.startDate = source.dateRange.startDate;
    target.endDate = source.dateRange.endDate;
    target.isMultiDay = source.dateRange.isMultiDay;

    // Capacity and revenue
    target.totalCapacity = source.totalCapacity;
    target.soldTickets = source.soldTickets;
    target.revenueAmount = source.getTotalRevenueAmount();
    target.revenueCurrency = source.getRevenueCurrency();

    // Timestamps
    target.updatedAt = source.updatedAt;
    target.publishedAt = source.publishedAt;
    target.cancelledAt = source.cancelledAt;
    target.cancellationReason = source.cancellationReason;

    // Update ticket types
    target.ticketTypes = this.ticketTypeMapper.toPersistenceArray(
      [...source.ticketTypes],
    );

    return target;
  }
}
