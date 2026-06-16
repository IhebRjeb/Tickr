import type { EventAnalyticsEntity } from '../../domain/entities/event-analytics.entity';
import type { TimeSeriesDataVO } from '../../domain/value-objects/time-series-data.vo';
import type { EventAnalyticsDto } from '../dtos/event-analytics.dto';
import type { TimeSeriesDto } from '../dtos/time-series.dto';

// ============================================
// Event Analytics Mapper (Domain ↔ DTO)
// ============================================

export class EventAnalyticsMapper {
  static toDto(entity: EventAnalyticsEntity): EventAnalyticsDto {
    return {
      eventId: entity.eventId,
      totalRevenue: entity.totalRevenue,
      currency: entity.currency,
      totalTicketsSold: entity.totalTicketsSold,
      totalCapacity: entity.totalCapacity,
      checkInCount: entity.checkInCount,
      checkInRate: entity.getCheckInRate(),
      conversionRate: entity.getConversionRate(),
      averageTicketPrice: entity.averageTicketPrice,
      topSellingTicketType: entity.topSellingTicketType,
      salesByDay: entity.salesByDay.map(EventAnalyticsMapper.timeSeriesVoToDto),
      checkInsByHour: entity.checkInsByHour.map(EventAnalyticsMapper.timeSeriesVoToDto),
      lastUpdated: entity.lastUpdated,
    };
  }

  static toDtoList(entities: EventAnalyticsEntity[]): EventAnalyticsDto[] {
    return entities.map((e) => EventAnalyticsMapper.toDto(e));
  }

  private static timeSeriesVoToDto(vo: TimeSeriesDataVO): TimeSeriesDto {
    return {
      timestamp: vo.timestamp,
      value: vo.value,
      label: vo.label,
    };
  }
}
