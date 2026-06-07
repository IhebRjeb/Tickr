import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ProcessScheduledNotificationsHandler } from '../../application/commands/process-scheduled-notifications/process-scheduled-notifications.handler';

/**
 * Notification Scheduler
 *
 * Cron job that periodically processes scheduled notifications.
 * Runs every 5 minutes by default.
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly processHandler: ProcessScheduledNotificationsHandler,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledNotifications(): Promise<void> {
    this.logger.debug('Running scheduled notification processing...');

    try {
      const result = await this.processHandler.execute();

      if (result.processed > 0 || result.failed > 0) {
        this.logger.log(
          `Scheduler run complete: ${result.processed} processed, ${result.failed} failed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Scheduler error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
