import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Error Response DTO
 * 
 * Standard error response format
 */
export class ErrorResponseDto {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  details?: unknown;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  path!: string;
}
