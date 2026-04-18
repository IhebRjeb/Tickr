/**
 * @file UnsubscribeHandler Unit Tests
 */

import { Logger } from '@nestjs/common';

import type { NotificationPreferenceRepositoryPort } from '@modules/notifications/application/ports/notification-preference.repository.port';
import { UnsubscribeCommand } from '@modules/notifications/application/commands/unsubscribe/unsubscribe.command';
import { UnsubscribeHandler } from '@modules/notifications/application/commands/unsubscribe/unsubscribe.handler';
import { NotificationPreferenceEntity } from '@modules/notifications/domain';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('UnsubscribeHandler', () => {
  let handler: UnsubscribeHandler;
  let mockPreferenceRepo: jest.Mocked<NotificationPreferenceRepositoryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validToken = 'a'.repeat(64);
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  const createPreference = (
    overrides: Record<string, unknown> = {},
  ): NotificationPreferenceEntity => {
    return NotificationPreferenceEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440099',
      userId: validUserId,
      emailEnabled: true,
      smsEnabled: true,
      marketingEnabled: true,
      eventRemindersEnabled: true,
      unsubscribeToken: validToken,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  beforeEach(() => {
    mockPreferenceRepo = {
      findByUnsubscribeToken: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEventPublisher = {
      publishFromAggregate: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new UnsubscribeHandler(mockPreferenceRepo, mockEventPublisher);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  describe('Success', () => {
    it('should unsubscribe from marketing', async () => {
      const preference = createPreference();
      mockPreferenceRepo.findByUnsubscribeToken.mockResolvedValue(preference);

      const command = new UnsubscribeCommand(validToken, 'marketing');
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(preference.marketingEnabled).toBe(false);
      expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe from event_reminders', async () => {
      const preference = createPreference();
      mockPreferenceRepo.findByUnsubscribeToken.mockResolvedValue(preference);

      const command = new UnsubscribeCommand(validToken, 'event_reminders');
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(preference.eventRemindersEnabled).toBe(false);
    });

    it('should publish domain events', async () => {
      const preference = createPreference();
      mockPreferenceRepo.findByUnsubscribeToken.mockResolvedValue(preference);

      const command = new UnsubscribeCommand(validToken, 'marketing');
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failures', () => {
    it('should fail with invalid token', async () => {
      mockPreferenceRepo.findByUnsubscribeToken.mockResolvedValue(null);

      const command = new UnsubscribeCommand('invalid-token', 'marketing');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_TOKEN');
    });

    it('should fail on persistence error', async () => {
      const preference = createPreference();
      mockPreferenceRepo.findByUnsubscribeToken.mockResolvedValue(preference);
      mockPreferenceRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new UnsubscribeCommand(validToken, 'marketing');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
