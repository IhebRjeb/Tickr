import { ValueObject } from '@shared/domain/value-object.base';

import { InvalidRecipientException } from '../exceptions/invalid-recipient.exception';

interface RecipientProps {
  email: string | null;
  phone: string | null;
}

/**
 * Recipient Value Object
 *
 * Represents a notification recipient with validated email and/or phone.
 * At least one contact method (email or phone) must be provided.
 *
 * Phone validation enforces Tunisia +216 format.
 * Email validation follows RFC 5322 basic pattern.
 */
export class RecipientVO extends ValueObject<RecipientProps> {
  /**
   * Create a recipient from an email address
   */
  static fromEmail(email: string): RecipientVO {
    return new RecipientVO({ email, phone: null });
  }

  /**
   * Create a recipient from a phone number
   */
  static fromPhone(phone: string): RecipientVO {
    return new RecipientVO({ email: null, phone });
  }

  /**
   * Create a recipient with both email and phone
   */
  static fromBoth(email: string, phone: string): RecipientVO {
    return new RecipientVO({ email, phone });
  }

  /**
   * Reconstitute from persisted data (no validation)
   */
  static reconstitute(email: string | null, phone: string | null): RecipientVO {
    const instance = Object.create(RecipientVO.prototype) as RecipientVO;
    Object.defineProperty(instance, 'props', {
      value: Object.freeze({ email, phone }),
      writable: false,
    });
    return instance;
  }

  get email(): string | null {
    return this.props.email;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get hasEmail(): boolean {
    return this.props.email !== null;
  }

  get hasPhone(): boolean {
    return this.props.phone !== null;
  }

  protected validate(props: RecipientProps): void {
    if (!props.email && !props.phone) {
      throw InvalidRecipientException.noContactMethod();
    }

    if (props.email && !RecipientVO.isValidEmail(props.email)) {
      throw InvalidRecipientException.invalidEmail(props.email);
    }

    if (props.phone && !RecipientVO.isValidPhone(props.phone)) {
      throw InvalidRecipientException.invalidPhone(props.phone);
    }
  }

  /**
   * Basic email format validation (RFC 5322 simplified)
   */
  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Phone validation for Tunisia (+216 format)
   * Accepts: +216XXXXXXXX (8 digits after country code)
   */
  private static isValidPhone(phone: string): boolean {
    return /^\+216\d{8}$/.test(phone);
  }
}
