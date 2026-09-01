import type { PaymentEventQueryPort } from '@modules/payments/application/ports/event-query.port';
import { PublicConfigController } from '@modules/payments/infrastructure/controllers/public-config.controller';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('PublicConfigController', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  let eventQuery: jest.Mocked<PaymentEventQueryPort>;
  let controller: PublicConfigController;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: number) => {
        if (key === 'payments.commission.rate') return 0.06;
        if (key === 'payments.order.expirationMinutes') return 15;
        return defaultValue;
      }),
    } as unknown as ConfigService;
    eventQuery = {
      getEventById: jest.fn(),
      getTicketType: jest.fn(),
    };
    controller = new PublicConfigController(configService, eventQuery);
  });

  it('should return the global commission without an event', async () => {
    await expect(controller.getPublicConfig({})).resolves.toEqual({
      globalCommissionRate: 0.06,
      commissionRateOverride: null,
      effectiveCommissionRate: 0.06,
      currency: 'TND',
      reservationTtlMinutes: 15,
    });
  });

  it('should return the event commission override as the effective rate', async () => {
    eventQuery.getEventById.mockResolvedValue({
      id: eventId,
      title: 'Test Event',
      status: 'PUBLISHED',
      startDate: new Date(),
      organizerId: '550e8400-e29b-41d4-a716-446655440002',
      commissionRateOverride: 0.03,
    });

    const result = await controller.getPublicConfig({ eventId });

    expect(result.globalCommissionRate).toBe(0.06);
    expect(result.commissionRateOverride).toBe(0.03);
    expect(result.effectiveCommissionRate).toBe(0.03);
  });

  it('should reject an unknown event', async () => {
    eventQuery.getEventById.mockResolvedValue(null);

    await expect(controller.getPublicConfig({ eventId })).rejects.toThrow(
      NotFoundException,
    );
  });
});