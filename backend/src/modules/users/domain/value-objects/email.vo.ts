import { ValueObject } from '@shared/domain/value-object.base';

import { InvalidEmailException } from '../exceptions/invalid-email.exception';

interface EmailProps {
  value: string;
}

/**
 * EmailVO Value Object
 *
 * Validates email according to RFC 5322 standard with additional rules:
 * - Lowercase normalization
 * - Trimming whitespace
 * - Domain validation
 *
 * @example
 * ```typescript
 * const email = EmailVO.create('User@Example.COM');
 * email.value; // 'user@example.com'
 * email.domain; // 'example.com'
 * ```
 */
export class EmailVO extends ValueObject<EmailProps> {
  // RFC 5322 compliant email regex (comprehensive)
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  private static readonly MAX_LENGTH = 255;

  /**
   * Get the email address value
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Get the local part (before @)
   */
  get localPart(): string {
    return this.props.value.split('@')[0];
  }

  /**
   * Get the domain part (after @)
   */
  get domain(): string {
    return this.props.value.split('@')[1];
  }

  /**
   * Create an EmailVO value object from a string
   * Normalizes to lowercase and trims whitespace
   *
   * @param email - Raw email string
   * @returns EmailVO value object
   * @throws InvalidEmailException if format is invalid
   */
  static create(email: string): EmailVO {
    if (!email) {
      throw new InvalidEmailException('empty');
    }
    return new EmailVO({ value: email.toLowerCase().trim() });
  }

  /**
   * Validate email format
   * @throws InvalidEmailException if invalid
   */
  protected validate(props: EmailProps): void {
    const { value } = props;

    if (!value) {
      throw new InvalidEmailException('empty');
    }

    if (value.length > EmailVO.MAX_LENGTH) {
      throw new InvalidEmailException(value);
    }

    if (!EmailVO.EMAIL_REGEX.test(value)) {
      throw new InvalidEmailException(value);
    }

    // Additional domain validation
    const domain = value.split('@')[1];
    if (!domain || domain.length < 3 || !domain.includes('.')) {
      throw new InvalidEmailException(value);
    }
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return this.value;
  }
}
