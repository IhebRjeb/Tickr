/**
 * Base class for all Domain Entities
 * 
 * Règles:
 * - TypeScript pur (pas de décorateurs)
 * - Logique métier uniquement
 * - Immutabilité préférée
 */
export abstract class BaseEntity<T> {
  protected readonly _id: string;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(id: string, createdAt?: Date) {
    this._id = id;
    this._createdAt = createdAt || new Date();
    this._updatedAt = new Date();
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
