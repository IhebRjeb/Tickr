import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when email format is invalid
 */
export class InvalidEmailException extends DomainException {
  constructor(email: string) {
    super(
      `Invalid email format: ${email}. Expected RFC 5322 compliant email.`,
      'INVALID_EMAIL',
    );
  }
}
