import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '@shared/infrastructure/cache/cache.service';

import { FraudDetectionPort } from '../../application/ports/fraud-detection.port';

// ============================================
// Fraud Detection Service (Infrastructure)
// ============================================

/**
 * Fraud Detection Service
 *
 * Infrastructure adapter implementing FraudDetectionPort.
 * Uses Redis (via CacheService) for rate limiting and tracking.
 *
 * Strategies:
 * 1. Rate limiting — max N orders per user per hour
 * 2. Ticket limit — max N tickets per user per event
 * 3. High-value detection — flag orders above threshold
 *
 * Fail-open: if Redis is unavailable, allows the operation
 * (better to accept potentially fraudulent order than block legit users)
 */
@Injectable()
export class FraudDetectionService implements FraudDetectionPort {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly maxOrdersPerHour: number;
  private readonly maxTicketsPerEvent: number;
  private readonly highValueThresholds: Record<string, number>;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.maxOrdersPerHour = this.configService.get<number>(
      'payments.fraud.maxOrdersPerHour',
      5,
    );
    this.maxTicketsPerEvent = this.configService.get<number>(
      'payments.fraud.maxTicketsPerEvent',
      10,
    );
    this.highValueThresholds = {
      TND: this.configService.get<number>('payments.fraud.highValueThresholdTND', 5000),
      EUR: this.configService.get<number>('payments.fraud.highValueThresholdEUR', 2000),
      USD: this.configService.get<number>('payments.fraud.highValueThresholdUSD', 2000),
    };
  }

  /**
   * Check if user has exceeded order rate limit
   * @returns true if within limit (allowed), false if rate-limited
   */
  async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const key = `payments:rate-limit:${userId}`;
      const current = await this.cacheService.get<number>(key);

      if (current === null) {
        // First order this hour
        await this.cacheService.set(key, 1, 3600); // 1 hour TTL
        return true;
      }

      if (current >= this.maxOrdersPerHour) {
        this.logger.warn(`Rate limit exceeded for user ${userId}: ${current}/${this.maxOrdersPerHour}`);
        return false;
      }

      // Increment (non-atomic but acceptable for rate limiting)
      await this.cacheService.set(key, current + 1, 3600);
      return true;
    } catch (error) {
      // Fail open — allow operation if Redis is down
      this.logger.error(`Rate limit check failed, allowing operation: ${error}`);
      return true;
    }
  }

  /**
   * Check if user has exceeded ticket limit per event
   * @returns true if within limit (allowed), false if exceeded
   */
  async checkTicketLimit(
    userId: string,
    eventId: string,
    requestedQuantity: number,
  ): Promise<boolean> {
    try {
      const key = `payments:ticket-limit:${userId}:${eventId}`;
      const current = await this.cacheService.get<number>(key);
      const existingCount = current ?? 0;

      if (existingCount + requestedQuantity > this.maxTicketsPerEvent) {
        this.logger.warn(
          `Ticket limit exceeded for user ${userId}, event ${eventId}: ` +
          `${existingCount} + ${requestedQuantity} > ${this.maxTicketsPerEvent}`,
        );
        return false;
      }

      // Update count (permanent until order expires/fails — handled elsewhere)
      await this.cacheService.set(key, existingCount + requestedQuantity, 86400); // 24h TTL
      return true;
    } catch (error) {
      this.logger.error(`Ticket limit check failed, allowing operation: ${error}`);
      return true;
    }
  }

  /**
   * Check if order amount triggers high-value review
   * @returns true if order is high-value and requires review
   */
  isHighValueOrder(totalAmount: number, currency: string): boolean {
    const threshold = this.highValueThresholds[currency.toUpperCase()];

    if (!threshold) {
      // Unknown currency — flag for review
      return true;
    }

    return totalAmount >= threshold;
  }
}
