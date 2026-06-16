import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeRangeQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  endDate!: string;
}

export class DashboardQueryDto {
  @ApiProperty({ description: 'Dashboard time range', enum: ['7d', '30d', '90d'], default: '30d' })
  @IsEnum(['7d', '30d', '90d'])
  @IsOptional()
  timeRange?: '7d' | '30d' | '90d';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class SalesTimelineQueryDto {
  @ApiProperty({ description: 'Time series granularity', enum: ['hour', 'day'], default: 'day' })
  @IsEnum(['hour', 'day'])
  @IsOptional()
  granularity?: 'hour' | 'day';

  @ApiProperty({ example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  endDate!: string;
}

export class ExportRequestDto {
  @ApiProperty({ description: 'Type of report to generate', enum: ['EVENT_REVENUE', 'PLATFORM_SUMMARY', 'TICKET_SALES'] })
  @IsEnum(['EVENT_REVENUE', 'PLATFORM_SUMMARY', 'TICKET_SALES'])
  reportType!: 'EVENT_REVENUE' | 'PLATFORM_SUMMARY' | 'TICKET_SALES';

  @ApiProperty({ description: 'Export file format', enum: ['CSV', 'PDF'] })
  @IsEnum(['CSV', 'PDF'])
  format!: 'CSV' | 'PDF';

  @ApiProperty({ example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Filter by event ID' })
  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class PlatformAnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
