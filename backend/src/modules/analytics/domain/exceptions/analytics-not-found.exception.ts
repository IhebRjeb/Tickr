import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Thrown when analytics data for the requested entity is not found.
 */
export class AnalyticsNotFoundException extends DomainException {
  constructor(entityType: string, entityId: string) {
    super(
      `Analytics not found for ${entityType} with id ${entityId}`,
      'ANALYTICS_NOT_FOUND',
    );
  }
}
