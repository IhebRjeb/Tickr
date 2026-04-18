import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepositoryPort,
} from '../../ports/notification-preference.repository.port';

import {
  UnsubscribeCommand,
  type UnsubscribeError,
} from './unsubscribe.command';

/**
 * Handler for UnsubscribeCommand
 *
 * Processes one-click unsubscribe from email footer links.
 * Looks up preferences by unsubscribe token and disables the category.
 */
@Injectable()
export class UnsubscribeHandler {
  private readonly logger = new Logger(UnsubscribeHandler.name);

  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepo: NotificationPreferenceRepositoryPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(
    command: UnsubscribeCommand,
  ): Promise<Result<void, UnsubscribeError>> {
    this.logger.debug(
      `Processing unsubscribe for category ${command.category}`,
    );

    // ============================================
    // 1. Find preferences by token
    // ============================================
    const preferences = await this.preferenceRepo.findByUnsubscribeToken(
      command.token,
    );

    if (!preferences) {
      return Result.fail({
        type: 'INVALID_TOKEN',
        message: 'Invalid or expired unsubscribe token',
      });
    }

    // ============================================
    // 2. Unsubscribe from category
    // ============================================
    const unsubResult = preferences.unsubscribe(command.category);
    if (unsubResult.isFailure) {
      return Result.fail({
        type: 'NOT_ALLOWED',
        message: unsubResult.error.message,
      });
    }

    // ============================================
    // 3. Persist and publish events
    // ============================================
    try {
      await this.preferenceRepo.save(preferences);
      await this.eventPublisher.publishFromAggregate(preferences);

      this.logger.log(
        `User ${preferences.userId} unsubscribed from ${command.category}`,
      );

      return Result.okVoid();
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
