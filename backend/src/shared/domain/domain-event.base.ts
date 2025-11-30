/**
 * Base class for all Domain Events
 * 
 * Utilisé pour communication inter-module
 * 
 * Exemple:
 * ```typescript
 * export class EventPublishedEvent extends DomainEvent {
 *   constructor(
 *     public readonly eventId: string,
 *     public readonly slug: string,
 *     public readonly publishedAt: Date,
 *   ) {
 *     super();
 *   }
 * }
 * ```
 */
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventId = this.generateEventId();
  }

  /**
   * Génère un ID unique pour l'événement
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retourne le nom de l'événement (nom de la classe)
   */
  get eventName(): string {
    return this.constructor.name;
  }

  /**
   * Serialize l'événement pour logs/debug
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      ...this.getData(),
    };
  }

  /**
   * Retourne les données spécifiques de l'événement
   */
  protected getData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    Object.keys(this).forEach((key) => {
      if (key !== 'occurredOn' && key !== 'eventId') {
        data[key] = (this as Record<string, unknown>)[key];
      }
    });
    return data;
  }
}
