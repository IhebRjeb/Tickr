import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when phone format is invalid
 */
export class InvalidPhoneFormatException extends DomainException {
  constructor(phone: string) {
    super(
      `Invalid phone format: ${phone}. Expected Tunisia format: +216XXXXXXXX`,
      'INVALID_PHONE_FORMAT',
    );
  }
}
