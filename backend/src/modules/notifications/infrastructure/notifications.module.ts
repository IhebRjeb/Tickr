import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProcessScheduledNotificationsHandler } from '../application/commands/process-scheduled-notifications/process-scheduled-notifications.handler';
import { RetryFailedNotificationHandler } from '../application/commands/retry-failed-notification/retry-failed-notification.handler';
import { SendBulkNotificationsHandler } from '../application/commands/send-bulk-notifications/send-bulk-notifications.handler';
import { SendNotificationHandler } from '../application/commands/send-notification/send-notification.handler';
import { UnsubscribeHandler } from '../application/commands/unsubscribe/unsubscribe.handler';
import { UpdatePreferencesHandler } from '../application/commands/update-preferences/update-preferences.handler';
import { NotificationEventHandlers } from '../application/event-handlers/notification-event.handlers';
import { NotificationMapper } from '../application/mappers/notification.mapper';
import { EMAIL_PROVIDER } from '../application/ports/email-provider.port';
import { NOTIFICATION_PREFERENCE_REPOSITORY } from '../application/ports/notification-preference.repository.port';
import { NOTIFICATION_TEMPLATE_REPOSITORY } from '../application/ports/notification-template.repository.port';
import { NOTIFICATION_REPOSITORY } from '../application/ports/notification.repository.port';
import { RATE_LIMITER } from '../application/ports/rate-limiter.port';
import { SMS_PROVIDER } from '../application/ports/sms-provider.port';
import { TEMPLATE_RENDERER } from '../application/ports/template-renderer.port';
import { GetNotificationByIdHandler } from '../application/queries/get-notification-by-id/get-notification-by-id.handler';
import { GetUserNotificationsHandler } from '../application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUserPreferencesHandler } from '../application/queries/get-user-preferences/get-user-preferences.handler';

import { NotificationsController } from './controllers/notifications.controller';
import { NotificationInfraEventHandlers } from './event-handlers/notification-infra-event.handlers';
import { NotificationPreferenceOrmEntity } from './persistence/entities/notification-preference.orm-entity';
import { NotificationTemplateOrmEntity } from './persistence/entities/notification-template.orm-entity';
import { NotificationOrmEntity } from './persistence/entities/notification.orm-entity';
import { NotificationPersistenceMapper } from './persistence/mappers/notification-persistence.mapper';
import { NotificationPreferencePersistenceMapper } from './persistence/mappers/notification-preference-persistence.mapper';
import { NotificationTemplatePersistenceMapper } from './persistence/mappers/notification-template-persistence.mapper';
import { NotificationPreferenceTypeOrmRepository } from './persistence/repositories/notification-preference.repository';
import { NotificationTemplateTypeOrmRepository } from './persistence/repositories/notification-template.repository';
import { NotificationTypeOrmRepository } from './persistence/repositories/notification.repository';
import { SesEmailProvider } from './providers/ses-email.provider';
import { SnsSmsProvider } from './providers/sns-sms.provider';
import { HandlebarsTemplateRenderer } from './services/handlebars-template-renderer.service';
import { NotificationScheduler } from './services/notification-scheduler.service';
import { RedisRateLimiter } from './services/redis-rate-limiter.service';

// ============================================
// Command Handlers
// ============================================
const CommandHandlers = [
  SendNotificationHandler,
  SendBulkNotificationsHandler,
  UpdatePreferencesHandler,
  UnsubscribeHandler,
  RetryFailedNotificationHandler,
  ProcessScheduledNotificationsHandler,
];

// ============================================
// Query Handlers
// ============================================
const QueryHandlers = [
  GetNotificationByIdHandler,
  GetUserNotificationsHandler,
  GetUserPreferencesHandler,
];

// ============================================
// Event Handlers
// ============================================
const EventHandlers = [
  NotificationEventHandlers,
  NotificationInfraEventHandlers,
];

// ============================================
// Repository Providers
// ============================================
const notificationRepoProvider: Provider = {
  provide: NOTIFICATION_REPOSITORY,
  useClass: NotificationTypeOrmRepository,
};

const preferenceRepoProvider: Provider = {
  provide: NOTIFICATION_PREFERENCE_REPOSITORY,
  useClass: NotificationPreferenceTypeOrmRepository,
};

const templateRepoProvider: Provider = {
  provide: NOTIFICATION_TEMPLATE_REPOSITORY,
  useClass: NotificationTemplateTypeOrmRepository,
};

// ============================================
// Service Providers
// ============================================
const emailProvider: Provider = {
  provide: EMAIL_PROVIDER,
  useClass: SesEmailProvider,
};

const smsProvider: Provider = {
  provide: SMS_PROVIDER,
  useClass: SnsSmsProvider,
};

const templateRendererProvider: Provider = {
  provide: TEMPLATE_RENDERER,
  useClass: HandlebarsTemplateRenderer,
};

const rateLimiterProvider: Provider = {
  provide: RATE_LIMITER,
  useClass: RedisRateLimiter,
};

/**
 * Notifications Module
 *
 * Bounded context for notification management including:
 * - Email notifications via AWS SES
 * - SMS notifications via AWS SNS
 * - User notification preferences
 * - Template-based rendering with Handlebars
 * - Scheduled notifications with cron processing
 * - Rate limiting per user and globally
 * - Retry with exponential backoff
 * - One-click email unsubscribe
 *
 * Cross-Module Integration:
 * - Listens to user.registered, ticket.confirmed, user.password-reset events
 * - Auto-retries failed notifications
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationOrmEntity,
      NotificationPreferenceOrmEntity,
      NotificationTemplateOrmEntity,
    ]),
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [
    // Persistence Mappers
    NotificationPersistenceMapper,
    NotificationPreferencePersistenceMapper,
    NotificationTemplatePersistenceMapper,

    // Application Mapper
    NotificationMapper,

    // Repositories
    notificationRepoProvider,
    preferenceRepoProvider,
    templateRepoProvider,

    // External Providers
    emailProvider,
    smsProvider,
    templateRendererProvider,
    rateLimiterProvider,

    // Scheduler
    NotificationScheduler,

    // CQRS Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [
    NOTIFICATION_REPOSITORY,
    NOTIFICATION_PREFERENCE_REPOSITORY,
    SendNotificationHandler,
  ],
})
export class NotificationsModule {}
