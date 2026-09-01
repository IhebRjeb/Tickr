// Events Module - Application Layer

// ============================================
// Commands (CQRS Write Operations)
// ============================================

// Create Event
export { CreateEventCommand } from './commands/create-event/create-event.command';
export type { CreateEventResultCommand, CreateEventErrorCommand } from './commands/create-event/create-event.command';
export { CreateEventHandler } from './commands/create-event/create-event.handler';
export type { CreateEventResult, CreateEventError } from './commands/create-event/create-event.handler';

// Update Event
export { UpdateEventCommand } from './commands/update-event/update-event.command';
export type { UpdateEventResultCommand, UpdateEventErrorCommand } from './commands/update-event/update-event.command';
export { UpdateEventHandler } from './commands/update-event/update-event.handler';
export type { UpdateEventResult, UpdateEventError } from './commands/update-event/update-event.handler';

// Set Event Commission Override (Admin)
export { SetEventCommissionOverrideCommand } from './commands/set-event-commission-override/set-event-commission-override.command';
export type {
  SetEventCommissionOverrideError,
  SetEventCommissionOverrideResult,
} from './commands/set-event-commission-override/set-event-commission-override.command';
export { SetEventCommissionOverrideHandler } from './commands/set-event-commission-override/set-event-commission-override.handler';

// Add Ticket Type
export { AddTicketTypeCommand } from './commands/add-ticket-type/add-ticket-type.command';
export type { AddTicketTypeResultCommand, AddTicketTypeErrorCommand } from './commands/add-ticket-type/add-ticket-type.command';
export { AddTicketTypeHandler } from './commands/add-ticket-type/add-ticket-type.handler';
export type { AddTicketTypeResult, AddTicketTypeError } from './commands/add-ticket-type/add-ticket-type.handler';

// Update Ticket Type
export { UpdateTicketTypeCommand } from './commands/update-ticket-type/update-ticket-type.command';
export type { UpdateTicketTypeResultCommand, UpdateTicketTypeErrorCommand } from './commands/update-ticket-type/update-ticket-type.command';
export { UpdateTicketTypeHandler } from './commands/update-ticket-type/update-ticket-type.handler';
export type { UpdateTicketTypeResult, UpdateTicketTypeError } from './commands/update-ticket-type/update-ticket-type.handler';

// Remove Ticket Type
export { RemoveTicketTypeCommand } from './commands/remove-ticket-type/remove-ticket-type.command';
export type { RemoveTicketTypeResultCommand, RemoveTicketTypeErrorCommand } from './commands/remove-ticket-type/remove-ticket-type.command';
export { RemoveTicketTypeHandler } from './commands/remove-ticket-type/remove-ticket-type.handler';
export type { RemoveTicketTypeResult, RemoveTicketTypeError } from './commands/remove-ticket-type/remove-ticket-type.handler';

// Publish Event
export { PublishEventCommand } from './commands/publish-event/publish-event.command';
export type { PublishEventResultCommand, PublishEventErrorCommand } from './commands/publish-event/publish-event.command';
export { PublishEventHandler } from './commands/publish-event/publish-event.handler';
export type { PublishEventResult, PublishEventError } from './commands/publish-event/publish-event.handler';

// Cancel Event
export { CancelEventCommand } from './commands/cancel-event/cancel-event.command';
export type { CancelEventResultCommand, CancelEventErrorCommand } from './commands/cancel-event/cancel-event.command';
export { CancelEventHandler } from './commands/cancel-event/cancel-event.handler';
export type { CancelEventResult, CancelEventError } from './commands/cancel-event/cancel-event.handler';

// Upload Event Image
export { UploadEventImageCommand } from './commands/upload-event-image/upload-event-image.command';
export type { UploadEventImageResultCommand, UploadEventImageError } from './commands/upload-event-image/upload-event-image.command';
export { UploadEventImageHandler } from './commands/upload-event-image/upload-event-image.handler';

// Complete Event (Scheduler)
export { CompleteEventCommand } from './commands/complete-event/complete-event.command';
export type { CompleteEventError } from './commands/complete-event/complete-event.command';
export { CompleteEventHandler } from './commands/complete-event/complete-event.handler';

// ============================================
// Queries (CQRS Read Operations)
// ============================================
export * from './queries';

// ============================================
// Event Handlers (Cross-Module Communication)
// ============================================
export * from './event-handlers';

// ============================================
// DTOs (Data Transfer Objects)
// ============================================
export * from './dtos';

// ============================================
// Ports (Repository Interfaces)
// ============================================
export * from './ports/event.repository.port';
export * from './ports/user-validation.service.port';

// ============================================
// Models (Query Models, Filters)
// ============================================
export * from './models';

// ============================================
// Services (Domain Service Interfaces)
// ============================================
export * from './services/event-capacity.service.port';
export { EventSchedulerService } from './services/event-scheduler.service';
