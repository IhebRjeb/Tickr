import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when password doesn't meet security requirements
 */
export class WeakPasswordException extends DomainException {
  constructor(reason?: string) {
    const message = reason
      ? `Password does not meet security requirements: ${reason}`
      : 'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character';
    super(message, 'WEAK_PASSWORD');
  }

  static tooShort(): WeakPasswordException {
    return new WeakPasswordException('Password must be at least 8 characters long');
  }

  static missingUppercase(): WeakPasswordException {
    return new WeakPasswordException('Password must contain at least 1 uppercase letter');
  }

  static missingNumber(): WeakPasswordException {
    return new WeakPasswordException('Password must contain at least 1 number');
  }

  static missingSpecialChar(): WeakPasswordException {
    return new WeakPasswordException('Password must contain at least 1 special character');
  }
}
