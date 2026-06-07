export const WEBHOOK_EVENT_STORE = Symbol('WEBHOOK_EVENT_STORE');

/**
 * Port for webhook event deduplication.
 *
 * Prevents duplicate processing of webhook events
 * that may be retried by payment gateways.
 */
export interface WebhookEventStorePort {
  /**
   * Check if a webhook event has already been processed.
   * If not, mark it as processed atomically.
   *
   * @returns true if the event is new (first time), false if duplicate
   */
  tryMarkAsProcessed(eventId: string, provider: string): Promise<boolean>;

  /**
   * Check if a webhook event has been processed (read-only).
   */
  isProcessed(eventId: string, provider: string): Promise<boolean>;
}
