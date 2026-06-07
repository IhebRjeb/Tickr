/**
 * @file GetUserPreferencesHandler Unit Tests
 */

import type { NotificationPreferenceRepositoryPort } from '@modules/notifications/application/ports/notification-preference.repository.port';
import { GetUserPreferencesHandler } from '@modules/notifications/application/queries/get-user-preferences/get-user-preferences.handler';
import { GetUserPreferencesQuery } from '@modules/notifications/application/queries/get-user-preferences/get-user-preferences.query';
import { NotificationPreferenceEntity } from '@modules/notifications/domain';

describe('GetUserPreferencesHandler', () => {
  let handler: GetUserPreferencesHandler;
  let mockPreferenceRepo: jest.Mocked<NotificationPreferenceRepositoryPort>;

  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  const createExistingPreference = (): NotificationPreferenceEntity => {
    return NotificationPreferenceEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440099',
      userId: validUserId,
      emailEnabled: true,
      smsEnabled: false,
      marketingEnabled: true,
      eventRemindersEnabled: true,
      unsubscribeToken: 'a'.repeat(64),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockPreferenceRepo = {
      findByUserId: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      findByUnsubscribeToken: jest.fn(),
    } as any;

    handler = new GetUserPreferencesHandler(mockPreferenceRepo);
  });

  describe('Existing preferences', () => {
    it('should return existing preferences', async () => {
      const existing = createExistingPreference();
      mockPreferenceRepo.findByUserId.mockResolvedValue(existing);

      const query = new GetUserPreferencesQuery(validUserId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.userId).toBe(validUserId);
      expect(result.value.smsEnabled).toBe(false);
      expect(result.value.marketingEnabled).toBe(true);
      expect(mockPreferenceRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('New user defaults', () => {
    it('should create default preferences for new user', async () => {
      mockPreferenceRepo.findByUserId.mockResolvedValue(null);

      const query = new GetUserPreferencesQuery(validUserId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.userId).toBe(validUserId);
      expect(result.value.emailEnabled).toBe(true);
      expect(result.value.smsEnabled).toBe(true);
      expect(result.value.marketingEnabled).toBe(false);
      expect(result.value.eventRemindersEnabled).toBe(true);
      expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
