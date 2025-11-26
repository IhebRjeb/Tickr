import { ValueObject } from '../value-object.base';

interface PhoneProps {
  value: string;
  countryCode: string;
}

export class InvalidPhoneException extends Error {
  constructor(phone: string) {
    super(`Invalid phone format: ${phone}. Expected Tunisia format: +216XXXXXXXX`);
    this.name = 'InvalidPhoneException';
  }
}

/**
 * Phone Value Object
 * 
 * Tunisia phone format: +216 followed by 8 digits
 */
export class Phone extends ValueObject<PhoneProps> {
  // Tunisia phone format: +216 followed by 8 digits
  private static readonly TUNISIA_REGEX = /^\+216[0-9]{8}$/;
  private static readonly TUNISIA_CODE = '+216';

  get value(): string {
    return this.props.value;
  }

  get countryCode(): string {
    return this.props.countryCode;
  }

  get nationalNumber(): string {
    return this.props.value.replace(this.props.countryCode, '');
  }

  get formatted(): string {
    const national = this.nationalNumber;
    return `${this.countryCode} ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }

  static create(phone: string): Phone {
    const cleaned = phone.replace(/\s/g, '');
    return new Phone({
      value: cleaned,
      countryCode: Phone.TUNISIA_CODE,
    });
  }

  protected validate(props: PhoneProps): void {
    if (!props.value || !Phone.TUNISIA_REGEX.test(props.value)) {
      throw new InvalidPhoneException(props.value);
    }
  }
}
