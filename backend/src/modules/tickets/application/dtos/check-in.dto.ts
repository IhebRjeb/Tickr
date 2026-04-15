import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Request DTO for checking in a ticket at a venue entrance
 */
export class CheckInDto {
  @ApiProperty({
    description: 'The scanned QR code string',
    example: 'v1-550e8400-e29b-41d4-a716-446655440000-a1b2',
  })
  @IsString()
  @MinLength(1)
  qrCode!: string;

  @ApiProperty({
    description: 'Device identifier for audit trail',
    example: 'scanner-gate-a-001',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  deviceId!: string;

  @ApiProperty({
    description: 'Gate or entrance location identifier',
    example: 'Gate A',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  locationGate!: string;
}

/**
 * Response DTO for check-in result (displayed on venue gate screen)
 */
export class CheckInResponseDto {
  @ApiProperty({
    description: 'Whether the check-in was successful',
    example: true,
  })
  isValid!: boolean;

  @ApiProperty({
    description: 'Ticket ID',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  ticketId!: string;

  @ApiProperty({
    description: 'Holder name for display',
    example: 'John Doe',
  })
  holderName!: string;

  @ApiProperty({
    description: 'Ticket type name for display',
    example: 'VIP Access',
  })
  ticketTypeName!: string;

  @ApiProperty({
    description: 'Check-in timestamp (null if invalid)',
    example: '2026-07-15T19:30:00Z',
    nullable: true,
  })
  checkedInAt!: Date | null;

  @ApiProperty({
    description: 'Failure reason (null if valid)',
    example: null,
    nullable: true,
  })
  failureReason!: string | null;
}
