import { ProcessScheduledNotificationsHandler } from '@modules/notifications/application/commands/process-scheduled-notifications/process-scheduled-notifications.handler';
import { NotificationScheduler } from '@modules/notifications/infrastructure/services/notification-scheduler.service';

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let mockProcessHandler: jest.Mocked<ProcessScheduledNotificationsHandler>;

  beforeEach(() => {
    mockProcessHandler = {
      execute: jest.fn(),
    } as any;

    scheduler = new NotificationScheduler(mockProcessHandler);
  });

  describe('processScheduledNotifications', () => {
    it('should call process handler execute', async () => {
      mockProcessHandler.execute.mockResolvedValue({
        processed: 3,
        failed: 1,
      });

      await scheduler.processScheduledNotifications();

      expect(mockProcessHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should not throw when handler returns zero results', async () => {
      mockProcessHandler.execute.mockResolvedValue({
        processed: 0,
        failed: 0,
      });

      await expect(
        scheduler.processScheduledNotifications(),
      ).resolves.not.toThrow();
    });

    it('should not throw when handler throws error', async () => {
      mockProcessHandler.execute.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        scheduler.processScheduledNotifications(),
      ).resolves.not.toThrow();
    });

    it('should handle non-Error thrown values', async () => {
      mockProcessHandler.execute.mockRejectedValue('string error');

      await expect(
        scheduler.processScheduledNotifications(),
      ).resolves.not.toThrow();
    });
  });
});
