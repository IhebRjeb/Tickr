import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
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
 * DTO for updating an existing ticket type
 *
 * All fields are optional - only provided fields will be updated.
 *
 * Business Rules:
 * - Cannot modify price after first sale
 * - Cannot reduce quantity below sold quantity
 * - Cannot modify sales period after first sale
 */
export class UpdateTicketTypeDto {
  @ApiPropertyOptional({
    description: 'Updated ticket type name',
    example: 'Super VIP Access',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated ticket type description',
    example: 'Now includes exclusive afterparty access!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'Updated organizer face price excluding service fees; cannot modify after first sale',
    example: 175.0,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({
    description: 'Updated price currency',
    enum: Currency,
    example: Currency.TND,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Updated quantity (cannot reduce below sold)',
    example: 150,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Updated sales start date (cannot modify after first sale)',
    example: '2026-06-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  salesStartDate?: string;

  @ApiPropertyOptional({
    description: 'Updated sales end date (cannot modify after first sale)',
    example: '2026-07-14T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  salesEndDate?: string;

  @ApiPropertyOptional({
    description: 'Whether the ticket type is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
