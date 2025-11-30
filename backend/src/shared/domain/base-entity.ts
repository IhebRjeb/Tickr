import { DomainEvent } from './domain-event.base';

/**
 * Base class for all Domain Entities (Aggregate Roots)
 * 
 * Règles:
 * - TypeScript pur (pas de décorateurs)
 * - Logique métier uniquement
 * - Support des domain events
 * - Immutabilité préférée
 */
export abstract class BaseEntity<T> {
  protected readonly _id: string;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;
  private _domainEvents: DomainEvent[] = [];

  constructor(id: string, createdAt?: Date) {
    if (!id || id.trim().length === 0) {
      throw new Error('Entity ID cannot be empty');
    }
    this._id = id;
    this._createdAt = createdAt || new Date();
    this._updatedAt = createdAt || new Date();
  }

  get id(): string {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Get all domain events and clear the list
   */
  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  /**
   * Add a domain event to be published
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Get domain events without clearing
   */
  get domainEvents(): readonly DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Clear all domain events
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Marque l'entité comme modifiée
   */
  protected touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Compare deux entités par leur ID
   */
  equals(entity?: BaseEntity<T>): boolean {
    if (!entity) return false;
    if (!(entity instanceof BaseEntity)) return false;
    return this._id === entity._id;
  }

  /**
   * Clone l'entité
   */
  abstract clone(): T;

  /**
   * Valide l'entité selon les règles métier
   */
  abstract validate(): void;
}
