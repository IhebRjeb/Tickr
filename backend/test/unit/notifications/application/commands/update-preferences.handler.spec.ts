/**
 * @file UpdatePreferencesHandler Unit Tests
 */

import { Logger } from '@nestjs/common';

import type { NotificationPreferenceRepositoryPort } from '@modules/notifications/application/ports/notification-preference.repository.port';
import { UpdatePreferencesCommand } from '@modules/notifications/application/commands/update-preferences/update-preferences.command';
import { UpdatePreferencesHandler } from '@modules/notifications/application/commands/update-preferences/update-preferences.handler';
import { NotificationPreferenceEntity } from '@modules/notifications/domain';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('UpdatePreferencesHandler', () => {
  let handler: UpdatePreferencesHandler;
  let mockPreferenceRepo: jest.Mocked<NotificationPreferenceRepositoryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  const createExistingPreference = (): NotificationPreferenceEntity => {
    return NotificationPreferenceEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440099',
      userId: validUserId,
      emailEnabled: true,
      smsEnabled: true,
      marketingEnabled: false,
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
      findById: jest.fn(),
    } as any;

    mockEventPublisher = {
      publishFromAggregate: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new UpdatePreferencesHandler(
      mockPreferenceRepo,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  describe('Create new preferences', () => {
    it('should create default preferences for new user', async () => {
      mockPreferenceRepo.findByUserId.mockResolvedValue(null);

      const command = new UpdatePreferencesCommand(validUserId);
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.userId).toBe(validUserId);
      expect(result.value.emailEnabled).toBe(true);
      expect(result.value.smsEnabled).toBe(true);
      expect(result.value.marketingEnabled).toBe(false);
      expect(result.value.eventRemindersEnabled).toBe(true);
      expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should create with custom values for new user', async () => {
      mockPreferenceRepo.findByUserId.mockResolvedValue(null);

      const command = new UpdatePreferencesCommand(
        validUserId,
        true,
        false,
        true,
        false,
      );
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.smsEnabled).toBe(false);
      expect(result.value.marketingEnabled).toBe(true);
      expect(result.value.eventRemindersEnabled).toBe(false);
    });
  });

  describe('Update existing preferences', () => {
    it('should update existing preferences', async () => {
      const existing = createExistingPreference();
      mockPreferenceRepo.findByUserId.mockResolvedValue(existing);

      const command = new UpdatePreferencesCommand(
        validUserId,
        undefined,
        undefined,
        true,
        undefined,
      );
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.marketingEnabled).toBe(true);
      expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failures', () => {
    it('should fail with invalid userId for new user', async () => {
      mockPreferenceRepo.findByUserId.mockResolvedValue(null);

      const command = new UpdatePreferencesCommand('invalid-id');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('VALIDATION_ERROR');
    });

    it('should fail on persistence error', async () => {
      mockPreferenceRepo.findByUserId.mockResolvedValue(
        createExistingPreference(),
      );
      mockPreferenceRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new UpdatePreferencesCommand(
        validUserId,
        false,
      );
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
