import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '../../domain/value-objects/notification-priority.vo';
import { NotificationStatus } from '../../domain/value-objects/notification-status.vo';
import { NotificationType } from '../../domain/value-objects/notification-type.vo';

/**
 * Response DTO for notification list views
 */
export class NotificationDto {
  @ApiProperty({ description: 'Notification ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({ enum: NotificationPriority })
  priority!: NotificationPriority;

  @ApiPropertyOptional()
  subject!: string | null;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiPropertyOptional()
  scheduledFor!: Date | null;

  @ApiPropertyOptional()
  sentAt!: Date | null;

  @ApiPropertyOptional()
  deliveredAt!: Date | null;

  @ApiPropertyOptional()
  failureReason!: string | null;

  @ApiProperty()
  retryCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/**
 * Response DTO for notification preferences
 */
export class NotificationPreferenceDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  emailEnabled!: boolean;

  @ApiProperty()
  smsEnabled!: boolean;

  @ApiProperty()
  marketingEnabled!: boolean;

  @ApiProperty()
  eventRemindersEnabled!: boolean;
}

/**
 * Request DTO for sending a notification
 */
export class SendNotificationRequestDto {
  @ApiProperty({ description: 'Target user ID' })
  userId!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiPropertyOptional()
  subject?: string;

  @ApiPropertyOptional({ description: 'Direct content (if no template)' })
  content?: string;

  @ApiPropertyOptional({ description: 'Template slug to render' })
  templateSlug?: string;

  @ApiPropertyOptional({ description: 'Data for template rendering' })
  templateData?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: NotificationPriority })
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Schedule for future delivery' })
  scheduledFor?: Date;

  @ApiProperty({ description: 'Recipient email' })
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Recipient phone (+216XXXXXXXX)' })
  recipientPhone?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}

/**
 * Request DTO for updating preferences
 */
export class UpdatePreferencesRequestDto {
  @ApiPropertyOptional()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  smsEnabled?: boolean;

  @ApiPropertyOptional()
  marketingEnabled?: boolean;

  @ApiPropertyOptional()
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
