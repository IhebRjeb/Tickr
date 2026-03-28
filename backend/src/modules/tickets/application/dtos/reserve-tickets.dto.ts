import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Holder information for a single ticket
 */
export class HolderInfoDto {
  @ApiProperty({
    description: 'Full name of the ticket holder',
    example: 'John Doe',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Email address of the ticket holder',
    example: 'john@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Phone number of the ticket holder',
    example: '+21612345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

/**
 * Request DTO for reserving tickets
 */
export class ReserveTicketsDto {
  @ApiProperty({
    description: 'Event to reserve tickets for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  eventId!: string;

  @ApiProperty({
    description: 'Ticket type to reserve',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  ticketTypeId!: string;

  @ApiProperty({
    description: 'Holder information for each ticket (1-10)',
    type: [HolderInfoDto],
  })
  @ValidateNested({ each: true })
  @Type(() => HolderInfoDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  holders!: HolderInfoDto[];
}

/**
 * Response DTO for ticket reservation
 */
export class ReserveTicketsResponseDto {
  @ApiProperty({
    description: 'IDs of the reserved tickets',
    example: ['550e8400-e29b-41d4-a716-446655440010'],
  })
  ticketIds!: string[];

  @ApiProperty({
    description: 'Reservation expiry time (15 min from now)',
    example: '2026-03-28T15:15:00Z',
  })
  reservedUntil!: Date;
}
