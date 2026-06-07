import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when trying to opt-out of transactional notifications
 */
export class PreferenceNotAllowedException extends DomainException {
  constructor(message: string) {
    super(message, 'PREFERENCE_NOT_ALLOWED');
  }

  static cannotDisableTransactional(): PreferenceNotAllowedException {
    return new PreferenceNotAllowedException(
      'Cannot unsubscribe from transactional notifications',
    );
  }
}
