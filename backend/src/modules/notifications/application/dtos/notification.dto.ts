import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

import { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '../../domain/value-objects/notification-priority.vo';
import { NotificationStatus } from '../../domain/value-objects/notification-status.vo';
import { NotificationType } from '../../domain/value-objects/notification-type.vo';

/**
 * Response DTO for notification list views
 */
export class NotificationDto {
  @ApiProperty({ description: 'Notification ID', example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({ description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440002' })
  userId!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationChannel, description: 'Delivery channel' })
  channel!: NotificationChannel;

  @ApiProperty({ enum: NotificationPriority, description: 'Priority level' })
  priority!: NotificationPriority;

  @ApiPropertyOptional({ description: 'Email subject line' })
  subject!: string | null;

  @ApiProperty({ enum: NotificationStatus, description: 'Current status' })
  status!: NotificationStatus;

  @ApiPropertyOptional({ description: 'Scheduled delivery time' })
  scheduledFor!: Date | null;

  @ApiPropertyOptional({ description: 'Time notification was sent' })
  sentAt!: Date | null;

  @ApiPropertyOptional({ description: 'Time notification was delivered' })
  deliveredAt!: Date | null;

  @ApiPropertyOptional({ description: 'Failure reason if failed' })
  failureReason!: string | null;

  @ApiProperty({ description: 'Number of retry attempts', example: 0 })
  retryCount!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

/**
 * Response DTO for notification preferences
 */
export class NotificationPreferenceDto {
  @ApiProperty({ description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440001' })
  userId!: string;

  @ApiProperty({ description: 'Email notifications enabled', example: true })
  emailEnabled!: boolean;

  @ApiProperty({ description: 'SMS notifications enabled', example: true })
  smsEnabled!: boolean;

  @ApiProperty({ description: 'Marketing notifications enabled', example: false })
  marketingEnabled!: boolean;

  @ApiProperty({ description: 'Event reminder notifications enabled', example: true })
  eventRemindersEnabled!: boolean;
}

/**
 * Request DTO for sending a notification
 */
export class SendNotificationRequestDto {
  @ApiProperty({ description: 'Target user ID', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type', example: NotificationType.ORDER_CONFIRMATION })
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ enum: NotificationChannel, description: 'Delivery channel', example: NotificationChannel.EMAIL })
  @IsNotEmpty()
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiPropertyOptional({ description: 'Email subject line', example: 'Your order is confirmed' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Direct content (if no template)', example: '<p>Hello!</p>' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Template slug to render', example: 'order-confirmation' })
  @IsOptional()
  @IsString()
  templateSlug?: string;

  @ApiPropertyOptional({ description: 'Data for template rendering', example: { name: 'John' } })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Message priority' })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Schedule for future delivery (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @ApiPropertyOptional({ description: 'Recipient email', example: 'user@tickr.tn' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Recipient phone (+216XXXXXXXX)', example: '+21612345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+216\d{8}$/, { message: 'Phone must be a valid Tunisian number (+216XXXXXXXX)' })
  recipientPhone?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Request DTO for updating preferences
 */
export class UpdatePreferencesRequestDto {
  @ApiPropertyOptional({ description: 'Enable email notifications', example: true })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications', example: true })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable marketing notifications', example: false })
  @IsOptional()
  @IsBoolean()
  marketingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable event reminder notifications', example: true })
  @IsOptional()
  @IsBoolean()
  eventRemindersEnabled?: boolean;
}

/**
 * Paginated notification list response
 */
export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationDto] })
  data!: NotificationDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
