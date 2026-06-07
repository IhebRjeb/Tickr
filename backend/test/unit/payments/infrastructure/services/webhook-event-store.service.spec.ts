import { InMemoryWebhookEventStore } from '@modules/payments/infrastructure/services/webhook-event-store.service';

describe('InMemoryWebhookEventStore', () => {
  let store: InMemoryWebhookEventStore;

  beforeEach(() => {
    store = new InMemoryWebhookEventStore();
  });

  describe('tryMarkAsProcessed', () => {
    it('should return true for a new event', async () => {
      const result = await store.tryMarkAsProcessed('evt_123', 'stripe');
      expect(result).toBe(true);
    });

    it('should return false for a duplicate event', async () => {
      await store.tryMarkAsProcessed('evt_123', 'stripe');
      const result = await store.tryMarkAsProcessed('evt_123', 'stripe');
      expect(result).toBe(false);
    });

    it('should treat same eventId from different providers as unique', async () => {
      await store.tryMarkAsProcessed('evt_123', 'stripe');
      const result = await store.tryMarkAsProcessed('evt_123', 'konnect');
      expect(result).toBe(true);
    });

    it('should handle multiple different events', async () => {
      expect(await store.tryMarkAsProcessed('evt_1', 'stripe')).toBe(true);
      expect(await store.tryMarkAsProcessed('evt_2', 'stripe')).toBe(true);
      expect(await store.tryMarkAsProcessed('evt_3', 'paymee')).toBe(true);
      expect(await store.tryMarkAsProcessed('evt_1', 'stripe')).toBe(false);
    });
  });

  describe('isProcessed', () => {
    it('should return false for unknown event', async () => {
      const result = await store.isProcessed('evt_unknown', 'stripe');
      expect(result).toBe(false);
    });

    it('should return true for processed event', async () => {
      await store.tryMarkAsProcessed('evt_123', 'stripe');
      const result = await store.isProcessed('evt_123', 'stripe');
      expect(result).toBe(true);
    });
  });
});
