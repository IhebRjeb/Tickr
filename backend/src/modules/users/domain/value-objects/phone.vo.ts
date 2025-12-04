import { ValueObject } from '@shared/domain/value-object.base';

import { InvalidPhoneFormatException } from '../exceptions/invalid-phone.exception';

interface PhoneProps {
  value: string;
  countryCode: string;
}

/**
 * PhoneVO Value Object
 *
 * Tunisia phone format: +216 followed by 8 digits
 * Supports optional phone numbers (null/undefined)
 *
 * @example
 * ```typescript
 * const phone = PhoneVO.create('+21622345678');
 * phone.formatted; // '+216 22 345 678'
 * phone.nationalNumber; // '22345678'
 *
 * const optional = PhoneVO.createOptional('');
 * // optional === null
 * ```
 */
export class PhoneVO extends ValueObject<PhoneProps> {
  // Tunisia phone format: +216 followed by 8 digits (must start with 2-9)
  private static readonly TUNISIA_REGEX = /^\+216[2-9][0-9]{7}$/;
  private static readonly TUNISIA_CODE = '+216';

  /**
   * Get the full phone number with country code
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Get the country code
   */
  get countryCode(): string {
    return this.props.countryCode;
  }

  /**
   * Get the national number without country code
   */
  get nationalNumber(): string {
    return this.props.value.replace(this.props.countryCode, '');
  }

  /**
   * Get formatted phone number for display
   * Format: +216 XX XXX XXX
   */
  get formatted(): string {
    const national = this.nationalNumber;
    return `${this.countryCode} ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }

  /**
   * Create a PhoneVO value object
   * Normalizes input by removing spaces and validating format
   *
   * @param phone - Phone number string
   * @returns PhoneVO value object
   * @throws InvalidPhoneFormatException if format is invalid
   */
  static create(phone: string): PhoneVO {
    if (!phone) {
      throw new InvalidPhoneFormatException('empty');
    }

    // Clean input: remove spaces, dashes, parentheses
    let cleaned = phone.replace(/[\s\-()]/g, '');

    // Handle local format (without country code) - must start with 2-9
    if (/^[2-9][0-9]{7}$/.test(cleaned)) {
      cleaned = PhoneVO.TUNISIA_CODE + cleaned;
    }

    // Handle format without + prefix - must start with 216 followed by 2-9
    if (/^216[2-9][0-9]{7}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    }

    return new PhoneVO({
      value: cleaned,
      countryCode: PhoneVO.TUNISIA_CODE,
    });
  }

  /**
   * Create an optional phone (returns null if empty/undefined)
   *
   * @param phone - Phone number string or undefined
   * @returns PhoneVO value object or null
   * @throws InvalidPhoneFormatException if non-empty but invalid format
   */
  static createOptional(phone: string | undefined | null): PhoneVO | null {
    if (!phone || phone.trim() === '') {
      return null;
    }
    return PhoneVO.create(phone);
  }

  /**
   * Check if a string is a valid Tunisia phone number
   *
   * @param phone - Phone number to validate
   * @returns boolean
   */
  static isValid(phone: string): boolean {
    try {
      PhoneVO.create(phone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone format
   * @throws InvalidPhoneFormatException if invalid
   */
  protected validate(props: PhoneProps): void {
    const { value } = props;

    if (!value) {
      throw new InvalidPhoneFormatException('empty');
    }

    if (!PhoneVO.TUNISIA_REGEX.test(value)) {
      throw new InvalidPhoneFormatException(value);
    }
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return this.value;
  }
}
