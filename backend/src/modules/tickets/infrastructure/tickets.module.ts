import { EventsModule } from '@modules/events/infrastructure/events.module';
import { TicketTypeOrmEntity } from '@modules/events/infrastructure/persistence/entities/ticket-type.orm-entity';
import { UsersModule } from '@modules/users/infrastructure/users.module';
import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CancelTicketsHandler } from '../application/commands/cancel-tickets/cancel-tickets.handler';
import { CheckInTicketHandler } from '../application/commands/check-in-ticket/check-in-ticket.handler';
import { ConfirmTicketsHandler } from '../application/commands/confirm-tickets/confirm-tickets.handler';
import { ExpireTicketsHandler } from '../application/commands/expire-tickets/expire-tickets.handler';
import { ReserveTicketsHandler } from '../application/commands/reserve-tickets/reserve-tickets.handler';
import { TransferTicketHandler } from '../application/commands/transfer-ticket/transfer-ticket.handler';
import { DuplicateCheckInAttemptedEventHandler } from '../application/event-handlers/duplicate-check-in-attempted.handler';
import { TicketCancelledEventHandler } from '../application/event-handlers/ticket-cancelled.handler';
import { TicketConfirmedEventHandler } from '../application/event-handlers/ticket-confirmed.handler';
import { TicketExpiredEventHandler } from '../application/event-handlers/ticket-expired.handler';
import { CHECK_IN_REPOSITORY } from '../application/ports/check-in.repository.port';
import { EVENT_CHECK_IN_ACCESS_PORT } from '../application/ports/event-check-in-access.port';
import { EVENT_QUERY_PORT } from '../application/ports/event-query.port';
import { TICKET_CHECK_IN_PERSISTENCE_PORT } from '../application/ports/ticket-check-in-persistence.port';
import { TICKET_REPOSITORY } from '../application/ports/ticket.repository.port';
import { USER_QUERY_PORT } from '../application/ports/user-query.port';
import { GetEventCheckInStatsHandler } from '../application/queries/get-event-check-in-stats/get-event-check-in-stats.handler';
import { GetEventTicketsHandler } from '../application/queries/get-event-tickets/get-event-tickets.handler';
import { GetTicketByIdHandler } from '../application/queries/get-ticket-by-id/get-ticket-by-id.handler';
import { GetTicketByQRCodeHandler } from '../application/queries/get-ticket-by-qr-code/get-ticket-by-qr-code.handler';
import { GetUserTicketsHandler } from '../application/queries/get-user-tickets/get-user-tickets.handler';

import { EventCheckInAccessAdapter } from './adapters/event-check-in-access.adapter';
import { EventQueryAdapter } from './adapters/event-query.adapter';
import { UserQueryAdapter } from './adapters/user-query.adapter';
import { TicketsController } from './controllers/tickets.controller';
import { DuplicateCheckInInfraHandler } from './event-handlers/duplicate-check-in-infra.listener';
import { TicketCancelledInfraHandler } from './event-handlers/ticket-cancelled-infra.listener';
import { TicketConfirmedInfraHandler } from './event-handlers/ticket-confirmed-infra.listener';
import { TicketExpiredInfraHandler } from './event-handlers/ticket-expired-infra.listener';
import { IsTicketOwnerGuard } from './guards/is-ticket-owner.guard';
import { CheckInOrmEntity } from './persistence/entities/check-in.orm-entity';
import { TicketOrmEntity } from './persistence/entities/ticket.orm-entity';
import { CheckInMapper } from './persistence/mappers/check-in.mapper';
import { TicketMapper } from './persistence/mappers/ticket.mapper';
import { CheckInTypeOrmRepository } from './persistence/repositories/check-in.repository';
import { TicketTypeOrmRepository } from './persistence/repositories/ticket.repository';
import { TicketCheckInTypeOrmRepository } from './repositories/ticket-check-in.repository';
import { PDFGeneratorService } from './services/pdf-generator.service';
import { QRCodeService } from './services/qr-code.service';
import { TicketExpirationService } from './services/ticket-expiration.service';
import { TicketS3StorageService } from './services/ticket-s3-storage.service';

// ============================================
// Command Handlers Collection
// ============================================
const CommandHandlers = [
  ReserveTicketsHandler,
  ConfirmTicketsHandler,
  CancelTicketsHandler,
  CheckInTicketHandler,
  TransferTicketHandler,
  ExpireTicketsHandler,
];

// ============================================
// Query Handlers Collection
// ============================================
const QueryHandlers = [
  GetTicketByIdHandler,
  GetTicketByQRCodeHandler,
  GetUserTicketsHandler,
  GetEventTicketsHandler,
  GetEventCheckInStatsHandler,
];

// ============================================
// Application Event Handlers (CQRS)
// ============================================
const AppEventHandlers = [
  TicketConfirmedEventHandler,
  TicketCancelledEventHandler,
  TicketExpiredEventHandler,
  DuplicateCheckInAttemptedEventHandler,
];

// ============================================
// Infrastructure Event Handlers (Side Effects)
// ============================================
const InfraEventHandlers = [
  TicketConfirmedInfraHandler,
  TicketCancelledInfraHandler,
  TicketExpiredInfraHandler,
  DuplicateCheckInInfraHandler,
];

// ============================================
// Repository Providers
// ============================================
const ticketRepositoryProvider: Provider = {
  provide: TICKET_REPOSITORY,
  useClass: TicketTypeOrmRepository,
};

const checkInRepositoryProvider: Provider = {
  provide: CHECK_IN_REPOSITORY,
  useClass: CheckInTypeOrmRepository,
};

const ticketCheckInPersistenceProvider: Provider = {
  provide: TICKET_CHECK_IN_PERSISTENCE_PORT,
  useClass: TicketCheckInTypeOrmRepository,
};

// ============================================
// Cross-Module Adapter Providers
// ============================================
const eventQueryProvider: Provider = {
  provide: EVENT_QUERY_PORT,
  useClass: EventQueryAdapter,
};

const eventCheckInAccessProvider: Provider = {
  provide: EVENT_CHECK_IN_ACCESS_PORT,
  useClass: EventCheckInAccessAdapter,
};

const userQueryProvider: Provider = {
  provide: USER_QUERY_PORT,
  useClass: UserQueryAdapter,
};

/**
 * Tickets Module
 *
 * Bounded context for ticket management including:
 * - Ticket reservation with 15-minute TTL
 * - Ticket confirmation after payment
 * - Ticket cancellation and refund flow
 * - QR code generation and validation
 * - Check-in at venue entrances
 * - Ticket transfer between users
 * - PDF ticket generation and S3 storage
 * - Automated expiration of unpaid reservations
 *
 * Architecture:
 * - Follows Hexagonal Architecture (Ports & Adapters)
 * - Uses CQRS pattern for command/query separation
 * - Event-driven for cross-module communication
 * - Repository pattern abstracts persistence
 *
 * Cross-Module Dependencies:
 * - EventsModule: For event/ticket type validation and availability management
 * - UsersModule: For user lookup during ticket transfer
 */
@Module({
  imports: [
    // TypeORM for persistence
    // Includes TicketTypeOrmEntity for cross-module availability queries
    TypeOrmModule.forFeature([
      TicketOrmEntity,
      CheckInOrmEntity,
      TicketTypeOrmEntity,
    ]),

    // CQRS for command/query separation
    CqrsModule,

    // Config module for S3 and scheduler configuration
    ConfigModule,

    // Cross-module dependencies
    UsersModule,
    EventsModule,
  ],
  controllers: [TicketsController],
  providers: [
    // Mappers
    TicketMapper,
    CheckInMapper,

    // Repositories
    ticketRepositoryProvider,
    checkInRepositoryProvider,
    ticketCheckInPersistenceProvider,

    // Cross-module adapters
    eventQueryProvider,
    eventCheckInAccessProvider,
    userQueryProvider,

    // Infrastructure services
    QRCodeService,
    PDFGeneratorService,
    TicketS3StorageService,
    TicketExpirationService,

    // Guards
    IsTicketOwnerGuard,

    // CQRS Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    ...AppEventHandlers,
    ...InfraEventHandlers,
  ],
  exports: [
    // Export repository tokens for potential use by other modules (e.g., Payments)
    TICKET_REPOSITORY,
    CHECK_IN_REPOSITORY,
  ],
})
export class TicketsModule {}
