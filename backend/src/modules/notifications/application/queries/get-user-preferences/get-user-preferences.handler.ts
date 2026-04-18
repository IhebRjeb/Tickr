import { Inject, Injectable } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import { NotificationPreferenceEntity } from '../../../domain/entities/notification-preference.entity';
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepositoryPort,
} from '../../ports/notification-preference.repository.port';

import { GetUserPreferencesQuery } from './get-user-preferences.query';

/**
 * Handler for GetUserPreferencesQuery
 *
 * Returns existing preferences or creates defaults for new users.
 */
@Injectable()
export class GetUserPreferencesHandler {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepo: NotificationPreferenceRepositoryPort,
  ) {}

  async execute(
    query: GetUserPreferencesQuery,
  ): Promise<Result<NotificationPreferenceEntity, never>> {
    let preferences = await this.preferenceRepo.findByUserId(
      query.userId,
    );

    if (!preferences) {
      // Create default preferences
      const createResult = NotificationPreferenceEntity.create({
        userId: query.userId,
      });

      if (createResult.isSuccess) {
        preferences = createResult.value;
        await this.preferenceRepo.save(preferences);
      }
    }

    return Result.ok(preferences!);
  }
}
