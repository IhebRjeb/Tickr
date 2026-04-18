import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { NotificationPreferenceEntity } from '../../../domain/entities/notification-preference.entity';
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepositoryPort,
} from '../../ports/notification-preference.repository.port';

import {
  UpdatePreferencesCommand,
  type UpdatePreferencesError,
  type UpdatePreferencesResult,
} from './update-preferences.command';

// Re-export types
export type { UpdatePreferencesResult, UpdatePreferencesError };

/**
 * Handler for UpdatePreferencesCommand
 *
 * Creates preferences if they don't exist (first time),
 * or updates existing preferences.
 */
@Injectable()
export class UpdatePreferencesHandler {
  private readonly logger = new Logger(UpdatePreferencesHandler.name);

  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepo: NotificationPreferenceRepositoryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: UpdatePreferencesCommand,
  ): Promise<Result<UpdatePreferencesResult, UpdatePreferencesError>> {
    this.logger.debug(
      `Updating preferences for user ${command.userId}`,
    );

    // ============================================
    // 1. Find or create preferences
    // ============================================
    let preferences = await this.preferenceRepo.findByUserId(
      command.userId,
    );

    if (!preferences) {
      const createResult = NotificationPreferenceEntity.create({
        userId: command.userId,
        emailEnabled: command.emailEnabled,
        smsEnabled: command.smsEnabled,
        marketingEnabled: command.marketingEnabled,
        eventRemindersEnabled: command.eventRemindersEnabled,
      });

      if (createResult.isFailure) {
        return Result.fail({
          type: 'VALIDATION_ERROR',
          message: createResult.error.message,
        });
      }

      preferences = createResult.value;
    } else {
      // ============================================
      // 2. Update existing preferences
      // ============================================
      preferences.updatePreferences({
        emailEnabled: command.emailEnabled,
        smsEnabled: command.smsEnabled,
        marketingEnabled: command.marketingEnabled,
        eventRemindersEnabled: command.eventRemindersEnabled,
      });
    }

    // ============================================
    // 3. Persist and publish events
    // ============================================
    try {
      await this.preferenceRepo.save(preferences);
      await this.eventPublisher.publishFromAggregate(preferences);

      this.logger.log(`Updated preferences for user ${command.userId}`);

      return Result.ok({
        userId: preferences.userId,
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        marketingEnabled: preferences.marketingEnabled,
        eventRemindersEnabled: preferences.eventRemindersEnabled,
      });
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to save preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
