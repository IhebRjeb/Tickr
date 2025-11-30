import { ValueObject } from '../value-object.base';

interface EmailProps {
  value: string;
}

export class InvalidEmailException extends Error {
  constructor(email: string) {
    super(`Invalid email format: ${email}`);
    this.name = 'InvalidEmailException';
  }
}

/**
 * Email Value Object
 * 
 * Validates email according to RFC 5322 standard
 */
export class Email extends ValueObject<EmailProps> {
  // RFC 5322 compliant email regex (simplified)
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  get value(): string {
    return this.props.value;
  }

  get localPart(): string {
    return this.props.value.split('@')[0];
  }

  get domain(): string {
    return this.props.value.split('@')[1];
  }

  static create(email: string): Email {
    return new Email({ value: email.toLowerCase().trim() });
  }

  protected validate(props: EmailProps): void {
    if (!props.value || !Email.EMAIL_REGEX.test(props.value)) {
      throw new InvalidEmailException(props.value);
    }
  }
}
