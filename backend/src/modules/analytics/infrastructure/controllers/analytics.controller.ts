import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CurrentUser, Roles } from '../../../users/infrastructure/decorators/auth.decorators';
import { JwtAuthGuard } from '../../../users/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../users/infrastructure/guards/roles.guard';
import { GenerateReportCommand } from '../../application/commands/generate-report/generate-report.command';
import { GenerateReportHandler } from '../../application/commands/generate-report/generate-report.handler';
import { GetEventAnalyticsHandler } from '../../application/queries/get-event-analytics/get-event-analytics.handler';
import { GetEventAnalyticsQuery } from '../../application/queries/get-event-analytics/get-event-analytics.query';
import { GetOrganizerDashboardHandler } from '../../application/queries/get-organizer-dashboard/get-organizer-dashboard.handler';
import { GetOrganizerDashboardQuery } from '../../application/queries/get-organizer-dashboard/get-organizer-dashboard.query';
import { GetPlatformAnalyticsHandler } from '../../application/queries/get-platform-analytics/get-platform-analytics.handler';
import { GetPlatformAnalyticsQuery } from '../../application/queries/get-platform-analytics/get-platform-analytics.query';
import { GetRevenueReportHandler } from '../../application/queries/get-revenue-report/get-revenue-report.handler';
import { GetRevenueReportQuery } from '../../application/queries/get-revenue-report/get-revenue-report.query';
import { GetSalesTimeSeriesHandler } from '../../application/queries/get-sales-time-series/get-sales-time-series.handler';
import { GetSalesTimeSeriesQuery } from '../../application/queries/get-sales-time-series/get-sales-time-series.query';

import {
  DashboardQueryDto,
  ExportRequestDto,
  PlatformAnalyticsQueryDto,
  SalesTimelineQueryDto,
  TimeRangeQueryDto,
} from './dtos/request.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token' })
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly getEventAnalyticsHandler: GetEventAnalyticsHandler,
    private readonly getOrganizerDashboardHandler: GetOrganizerDashboardHandler,
    private readonly getPlatformAnalyticsHandler: GetPlatformAnalyticsHandler,
    private readonly getSalesTimeSeriesHandler: GetSalesTimeSeriesHandler,
    private readonly getRevenueReportHandler: GetRevenueReportHandler,
    private readonly generateReportHandler: GenerateReportHandler,
  ) {}

  @Get('events/:id')
  @ApiOperation({ summary: 'Get analytics for a specific event' })
  @ApiResponse({ status: 200, description: 'Event analytics data' })
  @ApiResponse({ status: 404, description: 'Analytics not found for event' })
  async getEventAnalytics(
    @Param('id', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    const query = new GetEventAnalyticsQuery(
      eventId,
      user.userId,
      user.role === 'ADMIN',
    );

    const result = await this.getEventAnalyticsHandler.execute(query);

    if (result.isFailure) {
      switch (result.error.type) {
        case 'NOT_FOUND':
          throw new NotFoundException(result.error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(result.error.message);
      }
    }

    return result.value;
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get organizer dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Organizer dashboard data' })
  async getOrganizerDashboard(
    @CurrentUser() user: { userId: string; role: string },
    @Query() dto: DashboardQueryDto,
  ) {
    const query = new GetOrganizerDashboardQuery(
      user.userId,
      dto.timeRange ?? '30d',
      dto.page ?? 1,
      dto.limit ?? 10,
    );

    const result = await this.getOrganizerDashboardHandler.execute(query);

    if (result.isFailure) {
      throw new ForbiddenException(result.error.message);
    }

    return result.value;
  }

  @Get('platform')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get platform-wide analytics (admin only)' })
  @ApiResponse({ status: 200, description: 'Platform analytics data' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPlatformAnalytics(
    @CurrentUser() user: { userId: string; role: string },
    @Query() dto: PlatformAnalyticsQueryDto,
  ) {
    const query = new GetPlatformAnalyticsQuery(
      user.userId,
      user.role === 'ADMIN',
      dto.startDate ? new Date(dto.startDate) : undefined,
      dto.endDate ? new Date(dto.endDate) : undefined,
    );

    const result = await this.getPlatformAnalyticsHandler.execute(query);

    if (result.isFailure) {
      switch (result.error.type) {
        case 'NOT_FOUND':
          throw new NotFoundException(result.error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(result.error.message);
      }
    }

    return result.value;
  }

  @Get('events/:id/sales-timeline')
  @ApiOperation({ summary: 'Get sales time series for an event' })
  @ApiResponse({ status: 200, description: 'Time series data' })
  @ApiResponse({ status: 400, description: 'Invalid filters' })
  async getSalesTimeline(
    @Param('id', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: { userId: string; role: string },
    @Query() dto: SalesTimelineQueryDto,
  ) {
    const query = new GetSalesTimeSeriesQuery(
      eventId,
      dto.granularity ?? 'day',
      new Date(dto.startDate),
      new Date(dto.endDate),
      user.userId,
    );

    const result = await this.getSalesTimeSeriesHandler.execute(query);

    if (result.isFailure) {
      switch (result.error.type) {
        case 'INVALID_FILTERS':
          throw new BadRequestException(result.error.message);
        case 'NOT_FOUND':
          throw new NotFoundException(result.error.message);
      }
    }

    return result.value;
  }

  @Get('revenue-report')
  @ApiOperation({ summary: 'Get revenue report for a date range' })
  @ApiResponse({ status: 200, description: 'Revenue report data' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  async getRevenueReport(
    @CurrentUser() user: { userId: string; role: string },
    @Query() dto: TimeRangeQueryDto,
  ) {
    const query = new GetRevenueReportQuery(
      user.userId,
      new Date(dto.startDate),
      new Date(dto.endDate),
      user.role === 'ADMIN',
    );

    const result = await this.getRevenueReportHandler.execute(query);

    if (result.isFailure) {
      switch (result.error.type) {
        case 'INVALID_FILTERS':
          throw new BadRequestException(result.error.message);
        case 'NO_DATA':
          throw new NotFoundException(result.error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(result.error.message);
      }
    }

    return result.value;
  }

  @Post('export')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate and export analytics report (CSV/PDF)' })
  @ApiResponse({ status: 201, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid filters' })
  async exportReport(
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: ExportRequestDto,
  ) {
    const command = new GenerateReportCommand(
      dto.reportType,
      user.userId,
      dto.format,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.eventId,
    );

    const result = await this.generateReportHandler.execute(command);

    if (result.isFailure) {
      switch (result.error.type) {
        case 'INVALID_FILTERS':
          throw new BadRequestException(result.error.message);
        case 'NO_DATA':
          throw new NotFoundException(result.error.message);
        default:
          throw new BadRequestException(result.error.message);
      }
    }

    return result.value;
  }
}
