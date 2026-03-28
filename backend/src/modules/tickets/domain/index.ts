// Tickets Domain Layer

// Entities
export * from './entities/ticket.entity';
export * from './entities/check-in.entity';

// Value Objects
export * from './value-objects/qr-code.vo';
export * from './value-objects/ticket-status.vo';
export * from './value-objects/check-in-result.vo';

// Domain Events
export * from './events/ticket-reserved.event';
export * from './events/ticket-confirmed.event';
export * from './events/ticket-cancelled.event';
export * from './events/ticket-checked-in.event';
export * from './events/ticket-transferred.event';
export * from './events/ticket-expired.event';
export * from './events/duplicate-check-in-attempted.event';

// Exceptions
export * from './exceptions/invalid-ticket.exception';
export * from './exceptions/invalid-check-in.exception';
export * from './exceptions/invalid-qr-code.exception';
export * from './exceptions/ticket-not-confirmable.exception';
export * from './exceptions/ticket-not-cancellable.exception';
export * from './exceptions/ticket-not-checkable-in.exception';
export * from './exceptions/ticket-not-transferable.exception';
export * from './exceptions/ticket-not-expirable.exception';
