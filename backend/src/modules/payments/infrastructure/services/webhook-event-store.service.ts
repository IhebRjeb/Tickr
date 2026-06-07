import { Injectable, Logger } from '@nestjs/common';

import type { WebhookEventStorePort } from '../../application/ports/webhook-event-store.port';

/**
 * In-memory webhook event deduplication store.
 *
 * Tracks processed webhook event IDs with a TTL to prevent
 * duplicate processing when gateways retry delivery.
 *
 * Note: For multi-instance deployments, replace with Redis-backed
 * implementation using SET NX EX pattern.
 */
@Injectable()
export class InMemoryWebhookEventStore implements WebhookEventStorePort {
  private readonly logger = new Logger(InMemoryWebhookEventStore.name);
  private readonly processedEvents = new Map<string, number>();

  // TTL: 24 hours (webhook retries typically stop within a few hours)
  private readonly TTL_MS = 24 * 60 * 60 * 1000;

  // Cleanup interval: every hour
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

  constructor() {
    // Periodic cleanup of expired entries to prevent memory leaks
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS).unref();
  }

  async tryMarkAsProcessed(eventId: string, provider: string): Promise<boolean> {
    const key = `${provider}:${eventId}`;

    if (this.processedEvents.has(key)) {
      this.logger.warn(`Duplicate webhook event detected: ${key}`);
      return false;
    }

    this.processedEvents.set(key, Date.now());
    return true;
  }

  async isProcessed(eventId: string, provider: string): Promise<boolean> {
    const key = `${provider}:${eventId}`;
    return this.processedEvents.has(key);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.TTL_MS) {
        this.processedEvents.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired webhook event entries`);
    }
  }
}
