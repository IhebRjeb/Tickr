import { ApiProperty } from '@nestjs/swagger';

/**
 * API Response DTO
 * 
 * Standard success response format
 */
export class ApiResponseDto<T> {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  data!: T;

  @ApiProperty()
  timestamp!: string;
}
