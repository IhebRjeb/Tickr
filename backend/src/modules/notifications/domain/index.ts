// Notifications Domain Layer

// Entities
export * from './entities/notification.entity';
export * from './entities/notification-preference.entity';
export * from './entities/notification-template.entity';

// Value Objects
export * from './value-objects/notification-status.vo';
export * from './value-objects/notification-type.vo';
export * from './value-objects/notification-channel.vo';
export * from './value-objects/notification-priority.vo';
export * from './value-objects/template-category.vo';
export * from './value-objects/recipient.vo';

// Domain Events
export * from './events/notification-scheduled.event';
export * from './events/notification-sent.event';
export * from './events/notification-delivered.event';
export * from './events/notification-failed.event';
export * from './events/notification-retrying.event';
export * from './events/preferences-updated.event';
export * from './events/user-unsubscribed.event';

// Exceptions
export * from './exceptions/invalid-notification.exception';
export * from './exceptions/invalid-recipient.exception';
export * from './exceptions/invalid-template.exception';
export * from './exceptions/notification-not-sendable.exception';
export * from './exceptions/max-retries-exceeded.exception';
export * from './exceptions/rate-limit-exceeded.exception';
export * from './exceptions/channel-unavailable.exception';
export * from './exceptions/preference-not-allowed.exception';
export * from './exceptions/invalid-unsubscribe-token.exception';
export * from './exceptions/template-variable-missing.exception';
export * from './exceptions/notification-expired.exception';
