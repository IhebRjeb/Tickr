/**
 * Base class for all Domain Exceptions
 * 
 * Exceptions métier lancées par les entités Domain
 * 
 * Exemples:
 * ```typescript
 * export class EventAlreadyPublishedException extends DomainException {
 *   constructor(eventId: string) {
 *     super(`Event ${eventId} is already published`, 'EVENT_ALREADY_PUBLISHED');
 *   }
 * }
 * 
 * export class InsufficientTicketsException extends DomainException {
 *   constructor(available: number, requested: number) {
 *     super(
 *       `Only ${available} tickets available, but ${requested} requested`,
 *       'INSUFFICIENT_TICKETS'
 *     );
 *   }
 * }
 * ```
 */
export abstract class DomainException extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    
    // Capture stack trace (Node.js)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize l'exception pour logs/debug
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
