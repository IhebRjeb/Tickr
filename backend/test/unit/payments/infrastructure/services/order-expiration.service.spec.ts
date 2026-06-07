import { ExpireOrdersHandler } from '@modules/payments/application/commands/expire-orders/expire-orders.handler';
import { OrderExpirationService } from '@modules/payments/infrastructure/services/order-expiration.service';
import { ConfigService } from '@nestjs/config';


describe('OrderExpirationService', () => {
  let service: OrderExpirationService;
  let mockExpireOrdersHandler: jest.Mocked<ExpireOrdersHandler>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockExpireOrdersHandler = { execute: jest.fn() } as any;
    mockConfigService = {
      get: jest.fn().mockReturnValue(true),
    } as any;

    service = new OrderExpirationService(
      mockExpireOrdersHandler,
      mockConfigService,
    );
  });

  describe('expireOrders', () => {
    it('should call handler and log when orders are expired', async () => {
      mockExpireOrdersHandler.execute.mockResolvedValue({ expiredCount: 3 });

      await service.expireOrders();

      expect(mockExpireOrdersHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle zero expired orders silently', async () => {
      mockExpireOrdersHandler.execute.mockResolvedValue({ expiredCount: 0 });

      await service.expireOrders();

      expect(mockExpireOrdersHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should catch and log errors without throwing', async () => {
      mockExpireOrdersHandler.execute.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.expireOrders()).resolves.toBeUndefined();
    });

    it('should not execute when disabled', async () => {
      const disabledConfig = {
        get: jest.fn().mockReturnValue(false),
      } as any;

      const disabledService = new OrderExpirationService(
        mockExpireOrdersHandler,
        disabledConfig,
      );

      await disabledService.expireOrders();

      expect(mockExpireOrdersHandler.execute).not.toHaveBeenCalled();
    });
  });
});
