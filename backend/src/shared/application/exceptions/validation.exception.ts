import { ApplicationException } from './application.exception';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationException extends ApplicationException {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super('Validation failed', 'VALIDATION_ERROR');
    this.errors = errors;
  }

  static fromField(field: string, message: string, value?: unknown): ValidationException {
    return new ValidationException([{ field, message, value }]);
  }
}
