import { GetOrganizerDashboardHandler } from '@modules/analytics/application/queries/get-organizer-dashboard/get-organizer-dashboard.handler';
import { GetOrganizerDashboardQuery } from '@modules/analytics/application/queries/get-organizer-dashboard/get-organizer-dashboard.query';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { Logger } from '@nestjs/common';

describe('GetOrganizerDashboardHandler', () => {
  let handler: GetOrganizerDashboardHandler;
  let mockEventAnalyticsRepo: { findByOrganizerId: jest.Mock };
  let mockMetricRepo: { findByType: jest.Mock };
  let mockCache: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    mockEventAnalyticsRepo = { findByOrganizerId: jest.fn() };
    mockMetricRepo = { findByType: jest.fn() };
    mockCache = { get: jest.fn(), set: jest.fn() };

    handler = new GetOrganizerDashboardHandler(
      mockEventAnalyticsRepo as any,
      mockMetricRepo as any,
      mockCache as any,
    );
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  it('should return dashboard with aggregated stats', async () => {
    mockCache.get.mockResolvedValue(null);

    const makeEntity = (eventId: string, revenue: number, tickets: number, checkIns: number) => ({
      eventId,
      totalRevenue: revenue,
      currency: 'TND',
      totalTicketsSold: tickets,
      totalCapacity: tickets * 2,
      checkInCount: checkIns,
      averageTicketPrice: tickets > 0 ? revenue / tickets : 0,
      topSellingTicketType: 'VIP',
      salesByDay: [],
      checkInsByHour: [],
      lastUpdated: new Date(),
      getCheckInRate: () => (tickets > 0 ? Math.round((checkIns / tickets) * 10000) / 100 : 0),
      getConversionRate: () => (tickets > 0 ? Math.round((tickets / (tickets * 2)) * 10000) / 100 : 0),
    });

    mockEventAnalyticsRepo.findByOrganizerId.mockResolvedValue({
      data: [
        makeEntity('e1', 1000, 50, 40),
        makeEntity('e2', 500, 20, 15),
      ],
      total: 2,
    });
    mockMetricRepo.findByType.mockResolvedValue([
      { value: 300, timestamp: new Date('2025-03-01') },
      { value: 200, timestamp: new Date('2025-03-02') },
    ]);

    const query = new GetOrganizerDashboardQuery('org-1', '30d', 1, 10);

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value.totalRevenue).toBe(1500);
    expect(result.value.totalTicketsSold).toBe(70);
    expect(result.value.totalEvents).toBe(2);
    expect(result.value.averageCheckInRate).toBeCloseTo(78.57, 1);
    expect(result.value.revenueTimeline).toHaveLength(2);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should return cached result if available', async () => {
    const cached = { organizerId: 'org-1', totalRevenue: 999 };
    mockCache.get.mockResolvedValue(cached);

    const query = new GetOrganizerDashboardQuery('org-1', '30d', 1, 10);

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(cached);
    expect(mockEventAnalyticsRepo.findByOrganizerId).not.toHaveBeenCalled();
  });

  it('should handle zero tickets sold (no division by zero)', async () => {
    mockCache.get.mockResolvedValue(null);
    mockEventAnalyticsRepo.findByOrganizerId.mockResolvedValue({
      data: [
        {
          eventId: 'e1',
          totalRevenue: 0,
          currency: 'TND',
          totalTicketsSold: 0,
          totalCapacity: 100,
          checkInCount: 0,
          averageTicketPrice: 0,
          topSellingTicketType: null,
          salesByDay: [],
          checkInsByHour: [],
          lastUpdated: new Date(),
          getCheckInRate: () => 0,
          getConversionRate: () => 0,
        },
      ],
      total: 1,
    });
    mockMetricRepo.findByType.mockResolvedValue([]);

    const query = new GetOrganizerDashboardQuery('org-1', '7d', 1, 10);

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value.averageCheckInRate).toBe(0);
  });

  it('should respect time range parameter', async () => {
    mockCache.get.mockResolvedValue(null);
    mockEventAnalyticsRepo.findByOrganizerId.mockResolvedValue({ data: [], total: 0 });
    mockMetricRepo.findByType.mockResolvedValue([]);

    const query = new GetOrganizerDashboardQuery('org-1', '90d', 1, 10);

    await handler.execute(query);

    const [metricType, startDate] = mockMetricRepo.findByType.mock.calls[0];
    expect(metricType).toBe(MetricType.REVENUE);

    const daysDiff = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(90, 0);
  });
});
