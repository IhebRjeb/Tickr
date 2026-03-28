// Tickets Module - Application Layer

// ============================================
// Commands (CQRS Write Operations)
// ============================================

// Reserve Tickets
export { ReserveTicketsCommand } from './commands/reserve-tickets/reserve-tickets.command';
export type { ReserveTicketsResultCommand, ReserveTicketsErrorCommand } from './commands/reserve-tickets/reserve-tickets.command';
export { ReserveTicketsHandler } from './commands/reserve-tickets/reserve-tickets.handler';
export type { ReserveTicketsResult, ReserveTicketsError } from './commands/reserve-tickets/reserve-tickets.handler';

// Confirm Tickets
export { ConfirmTicketsCommand } from './commands/confirm-tickets/confirm-tickets.command';
export type { ConfirmTicketsResultCommand, ConfirmTicketsErrorCommand } from './commands/confirm-tickets/confirm-tickets.command';
export { ConfirmTicketsHandler } from './commands/confirm-tickets/confirm-tickets.handler';
export type { ConfirmTicketsResult, ConfirmTicketsError } from './commands/confirm-tickets/confirm-tickets.handler';

// Cancel Tickets
export { CancelTicketsCommand } from './commands/cancel-tickets/cancel-tickets.command';
export type { CancelTicketsErrorCommand } from './commands/cancel-tickets/cancel-tickets.command';
export { CancelTicketsHandler } from './commands/cancel-tickets/cancel-tickets.handler';
export type { CancelTicketsError } from './commands/cancel-tickets/cancel-tickets.handler';

// Check In Ticket
export { CheckInTicketCommand } from './commands/check-in-ticket/check-in-ticket.command';
export type { CheckInTicketResultCommand, CheckInTicketErrorCommand } from './commands/check-in-ticket/check-in-ticket.command';
export { CheckInTicketHandler } from './commands/check-in-ticket/check-in-ticket.handler';
export type { CheckInTicketResult, CheckInTicketError } from './commands/check-in-ticket/check-in-ticket.handler';

// Transfer Ticket
export { TransferTicketCommand } from './commands/transfer-ticket/transfer-ticket.command';
export type { TransferTicketResultCommand, TransferTicketErrorCommand } from './commands/transfer-ticket/transfer-ticket.command';
export { TransferTicketHandler } from './commands/transfer-ticket/transfer-ticket.handler';
export type { TransferTicketResult, TransferTicketError } from './commands/transfer-ticket/transfer-ticket.handler';

// Expire Tickets (Scheduler)
export { ExpireTicketsCommand } from './commands/expire-tickets/expire-tickets.command';
export type { ExpireTicketsResultCommand, ExpireTicketsErrorCommand } from './commands/expire-tickets/expire-tickets.command';
export { ExpireTicketsHandler } from './commands/expire-tickets/expire-tickets.handler';
export type { ExpireTicketsResult, ExpireTicketsError } from './commands/expire-tickets/expire-tickets.handler';

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
export * from './ports/ticket.repository.port';
export * from './ports/check-in.repository.port';
export * from './ports/event-query.port';
export * from './ports/user-query.port';

// ============================================
// Models (Query Models)
// ============================================
export * from './models';

// ============================================
// Services (Notification Port)
// ============================================
export * from './services/ticket-notification.port';
