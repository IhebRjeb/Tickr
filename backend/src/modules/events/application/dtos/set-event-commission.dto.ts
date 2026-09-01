import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNumber,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class SetEventCommissionOverrideDto {
  @ApiProperty({
    description:
      'Event-specific commission rate as a decimal, or null to use the global rate',
    example: 0.03,
    minimum: 0,
    maximum: 0.2,
    nullable: true,
  })
  @IsDefined()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(0.2)
  commissionRate!: number | null;
}