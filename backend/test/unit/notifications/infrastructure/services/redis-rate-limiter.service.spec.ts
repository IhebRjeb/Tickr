import { RedisRateLimiter } from '@modules/notifications/infrastructure/services/redis-rate-limiter.service';
import { ConfigService } from '@nestjs/config';

describe('RedisRateLimiter', () => {
  let rateLimiter: RedisRateLimiter;
  let mockRedis: any;
  let mockConfigService: jest.Mocked<ConfigService>;

  const createMockPipeline = (results: [Error | null, any][]) => ({
    zremrangebyscore: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(results),
  });

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, number> = {
          'notification.rateLimit.userPerHour': 20,
          'notification.rateLimit.emailPerSecond': 50,
          'notification.rateLimit.smsPerMinute': 100,
        };
        return config[key];
      }),
    } as any;

    mockRedis = {
      pipeline: jest.fn(),
    };

    rateLimiter = new RedisRateLimiter(mockRedis, mockConfigService);
  });

  describe('isAllowed', () => {
    it('should return true when under limit', async () => {
      mockRedis.pipeline.mockReturnValue(
        createMockPipeline([[null, 0], [null, 5]]),
      );

      const result = await rateLimiter.isAllowed('user-1');

      expect(result).toBe(true);
    });

    it('should return false when at limit', async () => {
      mockRedis.pipeline.mockReturnValue(
        createMockPipeline([[null, 0], [null, 20]]),
      );

      const result = await rateLimiter.isAllowed('user-1');

      expect(result).toBe(false);
    });

    it('should return false when over limit', async () => {
      mockRedis.pipeline.mockReturnValue(
        createMockPipeline([[null, 0], [null, 25]]),
      );

      const result = await rateLimiter.isAllowed('user-1');

      expect(result).toBe(false);
    });
  });

  describe('isEmailAllowed', () => {
    it('should return true when under email limit', async () => {
      mockRedis.pipeline.mockReturnValue(
        createMockPipeline([[null, 0], [null, 10]]),
      );

      expect(await rateLimiter.isEmailAllowed()).toBe(true);
    });

    it('should return false when at email limit', async () => {
      mockRedis.pipeline.mockReturnValue(
        createMockPipeline([[null, 0], [null, 50]]),
      );

      expect(await rateLimiter.isEmailAllowed()).toBe(false);
    });
  });

  describe('isSmsAllowed', () => {
    it('should return true when under SMS limit', async () => {
      mockRedis.pipeline.mockReturnValue(
        createMockPipeline([[null, 0], [null, 50]]),
      );

      expect(await rateLimiter.isSmsAllowed()).toBe(true);
    });

    it('should return false when at SMS limit', async () => {
      mockRedis.pipeline.mockReturnValue(
        createMockPipeline([[null, 0], [null, 100]]),
      );

      expect(await rateLimiter.isSmsAllowed()).toBe(false);
    });
  });

  describe('record', () => {
    it('should add entry to user window', async () => {
      const pipeline = createMockPipeline([]);
      mockRedis.pipeline.mockReturnValue(pipeline);

      await rateLimiter.record('user-1');

      expect(pipeline.zadd).toHaveBeenCalled();
      expect(pipeline.expire).toHaveBeenCalledWith(
        'notif:rate:user:user-1',
        3601,
      );
    });
  });

  describe('recordEmail', () => {
    it('should add entry to email window', async () => {
      const pipeline = createMockPipeline([]);
      mockRedis.pipeline.mockReturnValue(pipeline);

      await rateLimiter.recordEmail();

      expect(pipeline.zadd).toHaveBeenCalled();
      expect(pipeline.expire).toHaveBeenCalledWith(
        'notif:rate:email:global',
        2,
      );
    });
  });

  describe('recordSms', () => {
    it('should add entry to SMS window', async () => {
      const pipeline = createMockPipeline([]);
      mockRedis.pipeline.mockReturnValue(pipeline);

      await rateLimiter.recordSms();

      expect(pipeline.zadd).toHaveBeenCalled();
      expect(pipeline.expire).toHaveBeenCalledWith(
        'notif:rate:sms:global',
        61,
      );
    });
  });

  describe('default config', () => {
    it('should use defaults when config values are undefined', () => {
      const emptyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;

      const limiter = new RedisRateLimiter(mockRedis, emptyConfig);

      // Verify it constructs without error (defaults applied internally)
      expect(limiter).toBeDefined();
    });
  });
});
