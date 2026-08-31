import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@shared/infrastructure/common/decorators/public.decorator';

import { PAYMENT_EVENT_QUERY_PORT } from '../../application/ports/event-query.port';
import type { PaymentEventQueryPort } from '../../application/ports/event-query.port';

import { PublicConfigQueryDto } from './dtos/public-config-query.dto';

class PublicConfigResponse {
  @ApiProperty({
    description: 'Global commission rate configured for the platform',
    example: 0.06,
  })
  globalCommissionRate!: number;

  @ApiProperty({
    description: 'Event-specific rate, or null when the event inherits global',
    nullable: true,
    example: 0.03,
  })
  commissionRateOverride!: number | null;

  @ApiProperty({
    description: 'Commission rate applied to new orders for the event',
    example: 0.03,
  })
  effectiveCommissionRate!: number;

  @ApiProperty({ description: 'Pricing currency', example: 'TND' })
  currency!: string;

  @ApiProperty({
    description: 'Ticket reservation lifetime in minutes',
    example: 15,
  })
  reservationTtlMinutes!: number;
}

@ApiTags('Config')
@Controller('config')
export class PublicConfigController {
  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYMENT_EVENT_QUERY_PORT)
    private readonly eventQuery: PaymentEventQueryPort,
  ) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get public pricing configuration' })
  @ApiQuery({
    name: 'eventId',
    required: false,
    type: String,
    description: 'Event UUID used to resolve an event-specific commission',
  })
  @ApiResponse({
    status: 200,
    description: 'Public pricing configuration',
    type: PublicConfigResponse,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getPublicConfig(
    @Query() query: PublicConfigQueryDto,
  ): Promise<PublicConfigResponse> {
    const globalCommissionRate =
      this.configService.get<number>('payments.commission.rate') ??
      this.configService.get<number>('PLATFORM_COMMISSION_RATE', 0.06);
    const reservationTtlMinutes =
      this.configService.get<number>('payments.order.expirationMinutes') ??
      this.configService.get<number>('ORDER_EXPIRATION_MINUTES', 15);

    let commissionRateOverride: number | null = null;
    if (query.eventId) {
      const event = await this.eventQuery.getEventById(query.eventId);
      if (!event) {
        throw new NotFoundException(`Event ${query.eventId} not found`);
      }
      commissionRateOverride = event.commissionRateOverride;
    }

    return {
      globalCommissionRate,
      commissionRateOverride,
      effectiveCommissionRate:
        commissionRateOverride ?? globalCommissionRate,
      currency: 'TND',
      reservationTtlMinutes,
    };
  }
}