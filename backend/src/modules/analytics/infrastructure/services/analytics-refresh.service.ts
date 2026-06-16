import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RefreshAnalyticsCommand } from '../../application/commands/refresh-analytics/refresh-analytics.command';
import { RefreshAnalyticsHandler } from '../../application/commands/refresh-analytics/refresh-analytics.handler';

/**
 * Analytics Refresh Service
 *
 * Scheduled job that recalculates materialized analytics views.
 * Runs every 15 minutes by default.
 */
@Injectable()
export class AnalyticsRefreshService {
  private readonly logger = new Logger(AnalyticsRefreshService.name);

  constructor(
    private readonly refreshHandler: RefreshAnalyticsHandler,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleRefresh(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting scheduled analytics refresh');

    try {
      const command = new RefreshAnalyticsCommand();
      const result = await this.refreshHandler.execute(command);

      const elapsed = Date.now() - startTime;

      if (result.isSuccess) {
        this.logger.log(
          `Analytics refresh completed in ${elapsed}ms: ` +
            `${result.value.refreshedEvents} events, platform=${result.value.platformUpdated}`,
        );
      } else {
        this.logger.warn(`Analytics refresh failed: ${result.error.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Unhandled error in analytics refresh: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
