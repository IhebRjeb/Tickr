import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when recipient validation fails
 */
export class InvalidRecipientException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_RECIPIENT');
  }

  static noContactMethod(): InvalidRecipientException {
    return new InvalidRecipientException(
      'At least one contact method (email or phone) is required',
    );
  }

  static invalidEmail(email: string): InvalidRecipientException {
    return new InvalidRecipientException(
      `Invalid email format: ${email}`,
    );
  }

  static invalidPhone(phone: string): InvalidRecipientException {
    return new InvalidRecipientException(
      `Invalid phone format: ${phone}. Expected Tunisia format: +216XXXXXXXX`,
    );
  }
}
