import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/**
 * Request DTO for transferring a ticket to another user
 */
export class TransferTicketDto {
  @ApiProperty({
    description: 'Email of the new ticket owner',
    example: 'jane@example.com',
  })
  @IsEmail()
  newOwnerEmail!: string;
}

/**
 * Response DTO for ticket transfer
 */
export class TransferTicketResponseDto {
  @ApiProperty({
    description: 'The new QR code generated for the transferred ticket',
    example: 'v1-660e8400-f39c-52e5-b827-557766550111-c3d4',
  })
  newQrCode!: string;
}
