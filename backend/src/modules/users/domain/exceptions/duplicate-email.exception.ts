import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when attempting to register with an existing email
 */
export class DuplicateEmailException extends DomainException {
  constructor(email: string) {
    super(
      `An account with email ${email} already exists`,
      'DUPLICATE_EMAIL',
    );
  }
}
