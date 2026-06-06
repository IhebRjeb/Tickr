import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { PaymentMethod } from '../../../domain/value-objects/payment-method.vo';

// ============================================
// Create Order Request DTO
// ============================================

export class OrderItemHolderDto {
  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  readonly email: string;
}

export class CreateOrderItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsUUID()
  readonly ticketTypeId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  readonly quantity: number;

  @ApiProperty({ type: [OrderItemHolderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemHolderDto)
  readonly holders: OrderItemHolderDto[];
}

export class OrderHolderMetadataDto {
  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @IsNotEmpty()
  readonly firstName: string;

  @ApiProperty({ example: 'Ben Ali' })
  @IsString()
  @IsNotEmpty()
  readonly lastName: string;

  @ApiProperty({ example: 'ahmed@tick-r.tn' })
  @IsEmail()
  readonly email: string;
}

export class CreateOrderRequestDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsUUID()
  readonly eventId: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  readonly items: CreateOrderItemDto[];

  @ApiProperty({ description: 'Holder contact info for TN gateways' })
  @ValidateNested()
  @Type(() => OrderHolderMetadataDto)
  readonly holder: OrderHolderMetadataDto;
}

// ============================================
// Process Payment Request DTO
// ============================================

export class ProcessPaymentRequestDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.KONNECT })
  @IsEnum(PaymentMethod)
  readonly paymentMethod: PaymentMethod;
}

// ============================================
// Request Refund Request DTO
// ============================================

export class RequestRefundRequestDto {
  @ApiProperty({ example: 'Event cancelled by organizer' })
  @IsString()
  @IsNotEmpty()
  readonly reason: string;
}

// ============================================
// Query Params DTOs
// ============================================

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  readonly page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  readonly limit?: number = 20;
}
