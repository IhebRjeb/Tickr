import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ExpireOrdersHandler } from '../../application/commands/expire-orders/expire-orders.handler';

/**
 * Order Expiration Scheduled Service
 *
 * Runs every minute to expire orders that have exceeded their
 * 15-minute payment window.
 *
 * Design:
 * - Configurable enable/disable via SCHEDULER_ORDERS_ENABLED
 * - Delegates business logic to ExpireOrdersHandler
 * - Individual failures don't stop the batch
 * - Comprehensive logging for monitoring
 */
@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly expireOrdersHandler: ExpireOrdersHandler,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get<boolean>(
      'scheduler.orders.enabled',
      true,
    );

    if (!this.isEnabled) {
      this.logger.warn('Order expiration scheduler is DISABLED via configuration');
    } else {
      this.logger.log('Order expiration scheduler initialized');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'expire-pending-orders',
    timeZone: 'UTC',
  })
  async expireOrders(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.debug('Starting scheduled job: Expire pending orders');
    const startTime = Date.now();

    try {
      const result = await this.expireOrdersHandler.execute();
      const duration = Date.now() - startTime;

      if (result.expiredCount > 0) {
        this.logger.log(
          `Order expiration job completed in ${duration}ms: ${result.expiredCount} orders expired`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Scheduled job failed: expireOrders',
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
