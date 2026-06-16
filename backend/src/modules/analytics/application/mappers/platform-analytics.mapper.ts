import type { PlatformAnalyticsEntity } from '../../domain/entities/platform-analytics.entity';
import type { PlatformAnalyticsDto } from '../dtos/platform-analytics.dto';

// ============================================
// Platform Analytics Mapper (Domain ↔ DTO)
// ============================================

export class PlatformAnalyticsMapper {
  static toDto(entity: PlatformAnalyticsEntity): PlatformAnalyticsDto {
    return {
      id: entity.id,
      periodStart: entity.periodStart,
      periodEnd: entity.periodEnd,
      totalRevenue: entity.totalRevenue,
      currency: entity.currency,
      platformCommission: entity.platformCommission,
      totalEvents: entity.totalEvents,
      totalTicketsSold: entity.totalTicketsSold,
      activeUsers: entity.activeUsers,
      conversionRate: entity.conversionRate,
      revenueByCategory: entity.revenueByCategory.map((c) => ({
        category: c.category,
        revenue: c.revenue,
        percentage: c.percentage,
      })),
      topEvents: entity.topEvents.map((e) => ({
        eventId: e.eventId,
        title: e.title,
        revenue: e.revenue,
        ticketsSold: e.ticketsSold,
      })),
      lastUpdated: entity.lastUpdated,
    };
  }

  static toDtoList(entities: PlatformAnalyticsEntity[]): PlatformAnalyticsDto[] {
    return entities.map((e) => PlatformAnalyticsMapper.toDto(e));
  }
}
