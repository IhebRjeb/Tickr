import { Injectable } from '@nestjs/common';

import {
  PlatformAnalyticsEntity,
  PlatformAnalyticsProps,
} from '../../../domain/entities/platform-analytics.entity';
import { PlatformAnalyticsOrmEntity } from '../entities/platform-analytics.orm-entity';

/**
 * PlatformAnalytics Persistence Mapper
 *
 * Transforms between domain PlatformAnalyticsEntity and TypeORM PlatformAnalyticsOrmEntity.
 */
@Injectable()
export class PlatformAnalyticsPersistenceMapper {
  toPersistence(domain: PlatformAnalyticsEntity): PlatformAnalyticsOrmEntity {
    const entity = new PlatformAnalyticsOrmEntity();
    entity.id = domain.id;
    entity.periodStart = domain.periodStart;
    entity.periodEnd = domain.periodEnd;
    entity.totalRevenue = domain.totalRevenue;
    entity.currency = domain.currency;
    entity.platformCommission = domain.platformCommission;
    entity.totalEvents = domain.totalEvents;
    entity.totalTicketsSold = domain.totalTicketsSold;
    entity.activeUsers = domain.activeUsers;
    entity.conversionRate = domain.conversionRate;
    entity.revenueByCategory = domain.revenueByCategory;
    entity.topEvents = domain.topEvents;
    entity.lastUpdated = domain.lastUpdated;
    return entity;
  }

  toDomain(raw: PlatformAnalyticsOrmEntity): PlatformAnalyticsEntity {
    const props: PlatformAnalyticsProps = {
      id: raw.id,
      periodStart: raw.periodStart,
      periodEnd: raw.periodEnd,
      totalRevenue: Number(raw.totalRevenue),
      currency: raw.currency,
      platformCommission: Number(raw.platformCommission),
      totalEvents: raw.totalEvents,
      totalTicketsSold: raw.totalTicketsSold,
      activeUsers: raw.activeUsers,
      conversionRate: Number(raw.conversionRate),
      revenueByCategory: raw.revenueByCategory || [],
      topEvents: raw.topEvents || [],
      lastUpdated: raw.lastUpdated,
    };
    return PlatformAnalyticsEntity.reconstitute(props);
  }

  toDomainArray(entities: PlatformAnalyticsOrmEntity[]): PlatformAnalyticsEntity[] {
    return entities.map((e) => this.toDomain(e));
  }
}
