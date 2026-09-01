import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  IsNumber,
  IsPositive,
  IsInt,
  IsBoolean,
} from 'class-validator';


/**
 * DTO for adding a ticket type to an event
 *
 * Uses class-validator decorators for input validation.
 */
export class AddTicketTypeDto {
  @ApiProperty({
    description: 'Ticket type name',
    example: 'VIP Access',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Ticket type description',
    example: 'Includes backstage access and meet & greet',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({
    description:
      'Organizer-defined face price, excluding Tickr service fees. This is not a target buyer total.',
    example: 150.0,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({
    description: 'Price currency',
    enum: Currency,
    example: Currency.TND,
    default: Currency.TND,
  })
  @IsNotEmpty()
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({
    description: 'Total number of tickets available',
    example: 100,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiProperty({
    description: 'Sales start date and time (ISO 8601)',
    example: '2026-06-01T00:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  salesStartDate!: string;

  @ApiProperty({
    description: 'Sales end date and time (ISO 8601, must be before event start)',
    example: '2026-07-14T23:59:59Z',
  })
  @IsNotEmpty()
  @IsDateString()
  salesEndDate!: string;

  @ApiPropertyOptional({
    description: 'Whether the ticket type is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Response DTO for added ticket type
 */
export class AddTicketTypeResponseDto {
  @ApiProperty({
    description: 'Created ticket type ID',
    example: 'tt_1234567890_abc123',
  })
  ticketTypeId!: string;
}
