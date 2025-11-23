/**
 * Base class for all Value Objects
 * 
 * Caractéristiques:
 * - Immutable (readonly)
 * - Pas d'identité (comparaison par valeur)
 * - Validation dans constructor
 * 
 * Exemple:
 * ```typescript
 * export class Email extends ValueObject<{ value: string }> {
 *   get value(): string {
 *     return this.props.value;
 *   }
 * 
 *   protected validate(props: { value: string }): void {
 *     if (!this.isValidEmail(props.value)) {
 *       throw new InvalidEmailException();
 *     }
 *   }
 * 
 *   private isValidEmail(email: string): boolean {
 *     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 *   }
 * }
 * ```
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.validate(props);
    this.props = Object.freeze(props);
  }

  /**
   * Valide les propriétés du Value Object
   * Lance une exception si invalide
   */
  protected abstract validate(props: T): void;

  /**
   * Compare deux Value Objects par leurs valeurs
   */
  equals(vo?: ValueObject<T>): boolean {
    if (!vo) return false;
    if (!(vo instanceof ValueObject)) return false;
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * Retourne une copie des propriétés
   */
  getValue(): T {
    return { ...this.props };
  }
}
