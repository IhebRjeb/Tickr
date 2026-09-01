import { UsersModule } from '@modules/users/infrastructure/users.module';
import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@shared/infrastructure/cache/cache.module';

import { AddTicketTypeHandler } from '../application/commands/add-ticket-type/add-ticket-type.handler';
import { AssignEventCheckInStaffHandler } from '../application/commands/assign-event-check-in-staff/assign-event-check-in-staff.handler';
import { CancelEventHandler } from '../application/commands/cancel-event/cancel-event.handler';
import { CompleteEventHandler } from '../application/commands/complete-event/complete-event.handler';
import { CreateEventHandler } from '../application/commands/create-event/create-event.handler';
import { PublishEventHandler } from '../application/commands/publish-event/publish-event.handler';
import { RemoveTicketTypeHandler } from '../application/commands/remove-ticket-type/remove-ticket-type.handler';
import { RevokeEventCheckInStaffHandler } from '../application/commands/revoke-event-check-in-staff/revoke-event-check-in-staff.handler';
import { SetEventCommissionOverrideHandler } from '../application/commands/set-event-commission-override/set-event-commission-override.handler';
import { UpdateEventHandler } from '../application/commands/update-event/update-event.handler';
import { UpdateTicketTypeHandler } from '../application/commands/update-ticket-type/update-ticket-type.handler';
import { UploadEventImageHandler } from '../application/commands/upload-event-image/upload-event-image.handler';
import { EventCancelledEventHandler } from '../application/event-handlers/event-cancelled.handler';
import { EventPublishedEventHandler } from '../application/event-handlers/event-published.handler';
import { TicketTypeSoldOutEventHandler } from '../application/event-handlers/ticket-type-sold-out.handler';
import { EVENT_CHECK_IN_ACCESS_READ_PORT } from '../application/ports/event-check-in-access-read.port';
import { EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY } from '../application/ports/event-check-in-staff-assignment.repository.port';
import { EVENT_STAFF_USER_DIRECTORY } from '../application/ports/event-staff-user-directory.port';
import { EVENT_REPOSITORY, TICKET_TYPE_REPOSITORY } from '../application/ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../application/ports/user-validation.service.port';
import { GetEventByIdHandler } from '../application/queries/get-event-by-id/get-event-by-id.handler';
import { GetEventCheckInStaffHandler } from '../application/queries/get-event-check-in-staff/get-event-check-in-staff.handler';
import { GetEventsByCategoryHandler } from '../application/queries/get-events-by-category/get-events-by-category.handler';
import { GetMyEventCheckInAccessHandler } from '../application/queries/get-my-event-check-in-access/get-my-event-check-in-access.handler';
import { GetOrganizerEventsHandler } from '../application/queries/get-organizer-events/get-organizer-events.handler';
import { GetPublishedEventsHandler } from '../application/queries/get-published-events/get-published-events.handler';
import { GetUpcomingEventsHandler } from '../application/queries/get-upcoming-events/get-upcoming-events.handler';
import { ResolveEventCheckInAccessHandler } from '../application/queries/resolve-event-check-in-access/resolve-event-check-in-access.handler';
import { SearchEventsHandler } from '../application/queries/search-events/search-events.handler';
import { EventSchedulerService } from '../application/services/event-scheduler.service';

import { UserValidationServiceAdapter } from './adapters/user-validation.service.adapter';
import { EventsController } from './controllers/events.controller';
import { IsEventOwnerGuard } from './guards/is-event-owner.guard';
import { EventCheckInStaffAssignmentOrmEntity } from './persistence/entities/event-check-in-staff-assignment.orm-entity';
import { EventOrmEntity } from './persistence/entities/event.orm-entity';
import { TicketTypeOrmEntity } from './persistence/entities/ticket-type.orm-entity';
import { EventCheckInStaffAssignmentMapper } from './persistence/mappers/event-check-in-staff-assignment.mapper';
import { EventMapper } from './persistence/mappers/event.mapper';
import { TicketTypeMapper } from './persistence/mappers/ticket-type.mapper';
import { EventCheckInAccessReadTypeOrmRepository } from './repositories/event-check-in-access-read.repository';
import { EventCheckInStaffAssignmentTypeOrmRepository } from './repositories/event-check-in-staff-assignment.repository';
import { EventTypeOrmRepository } from './repositories/event.repository';
import { TicketTypeTypeOrmRepository } from './repositories/ticket-type.repository';
import { EventCacheService } from './services/event-cache.service';
import { S3StorageService } from './services/s3-storage.service';

// ============================================
// Command Handlers Collection
// ============================================
const CommandHandlers = [
  AssignEventCheckInStaffHandler,
  CreateEventHandler,
  UpdateEventHandler,
  PublishEventHandler,
  CancelEventHandler,
  AddTicketTypeHandler,
  UpdateTicketTypeHandler,
  RemoveTicketTypeHandler,
  RevokeEventCheckInStaffHandler,
  SetEventCommissionOverrideHandler,
  UploadEventImageHandler,
  CompleteEventHandler,
];

// ============================================
// Query Handlers Collection
// ============================================
const QueryHandlers = [
  GetEventCheckInStaffHandler,
  GetMyEventCheckInAccessHandler,
  GetEventByIdHandler,
  GetPublishedEventsHandler,
  SearchEventsHandler,
  GetEventsByCategoryHandler,
  GetUpcomingEventsHandler,
  GetOrganizerEventsHandler,
  ResolveEventCheckInAccessHandler,
];

// ============================================
// Event Handlers Collection (Cross-Module Communication)
// ============================================
const EventHandlers = [
  EventPublishedEventHandler,
  EventCancelledEventHandler,
  TicketTypeSoldOutEventHandler,
];

// ============================================
// Repository Provider
// ============================================
const repositoryProvider: Provider = {
  provide: EVENT_REPOSITORY,
  useClass: EventTypeOrmRepository,
};

// ============================================
// User Validation Service Provider
// ============================================
const userValidationServiceProvider: Provider = {
  provide: USER_VALIDATION_SERVICE,
  useClass: UserValidationServiceAdapter,
};

const eventStaffUserDirectoryProvider: Provider = {
  provide: EVENT_STAFF_USER_DIRECTORY,
  useExisting: USER_VALIDATION_SERVICE,
};

/**
 * Events Module
 *
 * Bounded context for event management including:
 * - Event creation and lifecycle management
 * - Ticket type configuration
 * - Image upload and storage
 * - Event publishing workflow
 * - Capacity management
 * - Scheduled tasks (event completion)
 *
 * Architecture:
 * - Follows Hexagonal Architecture (Ports & Adapters)
 * - Uses CQRS pattern for command/query separation
 * - Event-driven for cross-module communication
 * - Repository pattern abstracts persistence
 *
 * Cross-Module Dependencies:
 * - UsersModule: For organizer validation
 *
 * Future Integrations (via Event Handlers):
 * - NotificationsModule: Event publishing, cancellation, sold out alerts
 * - PaymentsModule: Refunds on event cancellation
 * - AnalyticsModule: Event metrics and recommendations
 */
@Module({
  imports: [
    // TypeORM for persistence
    TypeOrmModule.forFeature([
      EventOrmEntity,
      EventCheckInStaffAssignmentOrmEntity,
      TicketTypeOrmEntity,
    ]),

    // CQRS for command/query separation
    CqrsModule,

    // Config module for S3 and scheduler configuration
    ConfigModule,

    // Schedule module for cron jobs (event completion)
    ScheduleModule.forRoot(),

    // Cache module for Redis caching
    CacheModule,

    // Users module for organizer validation
    UsersModule,
  ],
  controllers: [EventsController],
  providers: [
    // Mappers
    EventMapper,
    EventCheckInStaffAssignmentMapper,
    TicketTypeMapper,

    // Repository
    repositoryProvider,
    {
      provide: EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY,
      useClass: EventCheckInStaffAssignmentTypeOrmRepository,
    },
    {
      provide: EVENT_CHECK_IN_ACCESS_READ_PORT,
      useClass: EventCheckInAccessReadTypeOrmRepository,
    },
    {
      provide: TICKET_TYPE_REPOSITORY,
      useClass: TicketTypeTypeOrmRepository,
    },

    // User validation service (cross-module adapter)
    userValidationServiceProvider,
    eventStaffUserDirectoryProvider,

    // S3 Storage service
    S3StorageService,

    // Cache service
    EventCacheService,

    // Scheduler service
    EventSchedulerService,

    // Guards
    IsEventOwnerGuard,

    // CQRS Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [
    // Export repository token for potential use by other modules
    EVENT_REPOSITORY,

    EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY,

    // Export ticket type repository for cross-module use (Payments)
    TICKET_TYPE_REPOSITORY,

    // Export event mapper for DTO transformations
    EventMapper,

    // Export cache service for cross-module use
    EventCacheService,
    ResolveEventCheckInAccessHandler,
  ],
})
export class EventsModule {}
