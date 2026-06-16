import { Injectable } from '@nestjs/common';

import {
  EventAnalyticsEntity,
  EventAnalyticsProps,
} from '../../../domain/entities/event-analytics.entity';
import { TimeSeriesDataVO } from '../../../domain/value-objects/time-series-data.vo';
import { EventAnalyticsOrmEntity } from '../entities/event-analytics.orm-entity';

/**
 * EventAnalytics Persistence Mapper
 *
 * Transforms between domain EventAnalyticsEntity and TypeORM EventAnalyticsOrmEntity.
 */
@Injectable()
export class EventAnalyticsPersistenceMapper {
  toPersistence(domain: EventAnalyticsEntity): EventAnalyticsOrmEntity {
    const entity = new EventAnalyticsOrmEntity();
    entity.eventId = domain.eventId;
    entity.totalRevenue = domain.totalRevenue;
    entity.currency = domain.currency;
    entity.totalTicketsSold = domain.totalTicketsSold;
    entity.totalCapacity = domain.totalCapacity;
    entity.checkInCount = domain.checkInCount;
    entity.conversionRate = domain.getConversionRate();
    entity.averageTicketPrice = domain.averageTicketPrice;
    entity.topSellingTicketType = domain.topSellingTicketType;
    entity.salesByDay = domain.salesByDay.map((vo) => vo.toJSON());
    entity.checkInsByHour = domain.checkInsByHour.map((vo) => vo.toJSON());
    entity.lastUpdated = domain.lastUpdated;
    return entity;
  }

  toDomain(raw: EventAnalyticsOrmEntity): EventAnalyticsEntity {
    const props: EventAnalyticsProps = {
      eventId: raw.eventId,
      totalRevenue: Number(raw.totalRevenue),
      currency: raw.currency,
      totalTicketsSold: raw.totalTicketsSold,
      totalCapacity: raw.totalCapacity,
      checkInCount: raw.checkInCount,
      conversionRate: Number(raw.conversionRate),
      averageTicketPrice: Number(raw.averageTicketPrice),
      topSellingTicketType: raw.topSellingTicketType,
      salesByDay: (raw.salesByDay || []).map((d) =>
        TimeSeriesDataVO.create(new Date(d.timestamp), d.value, d.label),
      ),
      checkInsByHour: (raw.checkInsByHour || []).map((d) =>
        TimeSeriesDataVO.create(new Date(d.timestamp), d.value, d.label),
      ),
      lastUpdated: raw.lastUpdated,
    };
    return EventAnalyticsEntity.reconstitute(props);
  }

  toDomainArray(entities: EventAnalyticsOrmEntity[]): EventAnalyticsEntity[] {
    return entities.map((e) => this.toDomain(e));
  }
}
