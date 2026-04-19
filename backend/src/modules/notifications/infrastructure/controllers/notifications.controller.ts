import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '@shared/infrastructure/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';

import { SendNotificationCommand } from '../../application/commands/send-notification/send-notification.command';
import { SendNotificationHandler } from '../../application/commands/send-notification/send-notification.handler';
import { UpdatePreferencesCommand } from '../../application/commands/update-preferences/update-preferences.command';
import { UpdatePreferencesHandler } from '../../application/commands/update-preferences/update-preferences.handler';
import { UnsubscribeCommand } from '../../application/commands/unsubscribe/unsubscribe.command';
import { UnsubscribeHandler } from '../../application/commands/unsubscribe/unsubscribe.handler';
import {
  SendNotificationRequestDto,
  UpdatePreferencesRequestDto,
  NotificationDto,
  NotificationPreferenceDto,
  PaginatedNotificationsDto,
} from '../../application/dtos/notification.dto';
import { NotificationMapper } from '../../application/mappers/notification.mapper';
import { GetNotificationByIdQuery } from '../../application/queries/get-notification-by-id/get-notification-by-id.query';
import { GetNotificationByIdHandler } from '../../application/queries/get-notification-by-id/get-notification-by-id.handler';
import { GetUserNotificationsQuery } from '../../application/queries/get-user-notifications/get-user-notifications.query';
import { GetUserNotificationsHandler } from '../../application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUserPreferencesQuery } from '../../application/queries/get-user-preferences/get-user-preferences.query';
import { GetUserPreferencesHandler } from '../../application/queries/get-user-preferences/get-user-preferences.handler';
import { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '../../domain/value-objects/notification-priority.vo';
import { NotificationType } from '../../domain/value-objects/notification-type.vo';

/**
 * Notifications REST Controller
 */
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly sendHandler: SendNotificationHandler,
    private readonly updatePreferencesHandler: UpdatePreferencesHandler,
    private readonly unsubscribeHandler: UnsubscribeHandler,
    private readonly getByIdHandler: GetNotificationByIdHandler,
    private readonly getUserNotificationsHandler: GetUserNotificationsHandler,
    private readonly getUserPreferencesHandler: GetUserPreferencesHandler,
    private readonly mapper: NotificationMapper,
  ) {}

  // ============================================
  // Notification Endpoints
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a notification' })
  @ApiBody({ type: SendNotificationRequestDto })
  @ApiResponse({ status: 201, description: 'Notification sent/scheduled' })
  @ApiResponse({ status: 400, description: 'Validation error or send failure' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendNotification(
    @Body() dto: SendNotificationRequestDto,
  ): Promise<{ notificationId: string; status: string }> {
    const command = new SendNotificationCommand(
      dto.userId,
      dto.type as NotificationType,
      dto.channel as NotificationChannel,
      { email: dto.recipientEmail, phone: dto.recipientPhone },
      dto.subject ?? null,
      dto.content ?? null,
      dto.templateSlug ?? null,
      dto.templateData ?? {},
      (dto.priority as NotificationPriority) ?? null,
      dto.scheduledFor ?? null,
      dto.metadata ?? {},
    );

    const result = await this.sendHandler.execute(command);

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return result.value;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, type: PaginatedNotificationsDto, description: 'Paginated notification list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginatedNotificationsDto> {
    const query = new GetUserNotificationsQuery(
      userId,
      Number(page),
      Number(limit),
    );
    const result = await this.getUserNotificationsHandler.execute(query);
    const { data, total } = result.value;
    return this.mapper.toPaginatedDto(data, total, Number(page), Number(limit));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification UUID', type: 'string' })
  @ApiResponse({ status: 200, type: NotificationDto, description: 'Notification details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotificationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<NotificationDto> {
    const query = new GetNotificationByIdQuery(id, userId);
    const result = await this.getByIdHandler.execute(query);

    if (result.isFailure) {
      throw new NotFoundException(result.error.message);
    }

    return this.mapper.toDto(result.value);
  }

  // ============================================
  // Preference Endpoints
  // ============================================

  @Get('preferences/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @ApiResponse({ status: 200, type: NotificationPreferenceDto, description: 'User preferences' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPreferences(
    @CurrentUser('id') userId: string,
  ): Promise<NotificationPreferenceDto> {
    const query = new GetUserPreferencesQuery(userId);
    const result = await this.getUserPreferencesHandler.execute(query);
    return this.mapper.toPreferenceDto(result.value);
  }

  @Put('preferences/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ type: UpdatePreferencesRequestDto })
  @ApiResponse({ status: 200, type: NotificationPreferenceDto, description: 'Updated preferences' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMyPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesRequestDto,
  ): Promise<NotificationPreferenceDto> {
    const command = new UpdatePreferencesCommand(
      userId,
      dto.emailEnabled,
      dto.smsEnabled,
      dto.marketingEnabled,
      dto.eventRemindersEnabled,
    );

    const result =
      await this.updatePreferencesHandler.execute(command);

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return {
      userId: result.value.userId,
      emailEnabled: result.value.emailEnabled,
      smsEnabled: result.value.smsEnabled,
      marketingEnabled: result.value.marketingEnabled,
      eventRemindersEnabled: result.value.eventRemindersEnabled,
    };
  }

  // ============================================
  // Unsubscribe Endpoint (Public - no auth)
  // ============================================

  @Get('unsubscribe/:token/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe via email link' })
  @ApiParam({ name: 'token', description: 'Unsubscribe token from email', type: 'string' })
  @ApiParam({ name: 'category', description: 'Preference category', enum: ['marketing', 'event_reminders'] })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or category' })
  async unsubscribe(
    @Param('token') token: string,
    @Param('category') category: string,
  ): Promise<{ message: string }> {
    if (category !== 'marketing' && category !== 'event_reminders') {
      throw new BadRequestException('Invalid category');
    }

    const command = new UnsubscribeCommand(
      token,
      category as 'marketing' | 'event_reminders',
    );

    const result = await this.unsubscribeHandler.execute(command);

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return { message: 'Successfully unsubscribed' };
  }
}
