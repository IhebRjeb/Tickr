import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '@shared/infrastructure/cache/cache.service';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  }));
});

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisClient: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    keys: jest.Mock;
    ping: jest.Mock;
    quit: jest.Mock;
    on: jest.Mock;
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'password',
        REDIS_TTL: 300,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Initialize the service to create Redis client
    await service.onModuleInit();

    // Get reference to the mocked Redis client
     
    mockRedisClient = (service as any).client;
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateKey', () => {
    it('should generate key with naming convention', () => {
      const key = service.generateKey('users', 'profile', '123');
      expect(key).toBe('users:profile:123');
    });

    it('should handle empty strings', () => {
      const key = service.generateKey('', '', '');
      expect(key).toBe('::');
    });
  });

  describe('get', () => {
    it('should return parsed value when key exists', async () => {
      const testData = { id: 1, name: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null and log error on Redis error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'));

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('test-key', { data: 'value' });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
        'EX',
        300, // Default TTL from config
      );
    });

    it('should set value with custom TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('test-key', { data: 'value' }, 600);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
        'EX',
        600,
      );
    });

    it('should handle Redis error gracefully', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.set('test-key', { data: 'value' })).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis error gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('test-key')).resolves.not.toThrow();
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedisClient.del.mockResolvedValue(3);

      await service.invalidatePattern('users:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('users:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should not call del when no keys match pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.invalidatePattern('non-existent:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('non-existent:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis error gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.invalidatePattern('users:*')).resolves.not.toThrow();
    });
  });

  describe('isHealthy', () => {
    it('should return true when Redis responds to ping', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when Redis fails to respond', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });
});
