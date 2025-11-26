import { ExecutionContext, CallHandler } from '@nestjs/common';
import { CacheInterceptor } from '@shared/infrastructure/cache/cache.interceptor';
import { CacheService } from '@shared/infrastructure/cache/cache.service';
import { of } from 'rxjs';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let mockCacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };

  const createMockExecutionContext = (
    method: string,
    url: string,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url }),
        getResponse: () => ({}),
        getNext: () => undefined,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    interceptor = new CacheInterceptor(mockCacheService as unknown as CacheService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should return cached value when available', async () => {
    const cachedData = { id: 1, name: 'cached' };
    mockCacheService.get.mockResolvedValue(cachedData);

    const context = createMockExecutionContext('GET', '/api/users');
    const handler: CallHandler = {
      handle: () => of({ id: 1, name: 'fresh' }),
    };

    const result$ = await interceptor.intercept(context, handler);
    
    return new Promise<void>((resolve, reject) => {
      result$.subscribe({
        next: (value) => {
          try {
            expect(value).toEqual(cachedData);
            expect(mockCacheService.get).toHaveBeenCalledWith('cache:GET:/api/users');
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        error: reject,
      });
    });
  });

  it('should call handler and cache response when cache miss', async () => {
    const freshData = { id: 1, name: 'fresh' };
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);

    const context = createMockExecutionContext('GET', '/api/users');
    const handler: CallHandler = {
      handle: () => of(freshData),
    };

    const result$ = await interceptor.intercept(context, handler);

    return new Promise<void>((resolve, reject) => {
      result$.subscribe({
        next: (value) => {
          try {
            expect(value).toEqual(freshData);
            // Wait for async set to complete
            setTimeout(() => {
              expect(mockCacheService.set).toHaveBeenCalledWith(
                'cache:GET:/api/users',
                freshData,
              );
              resolve();
            }, 10);
          } catch (e) {
            reject(e);
          }
        },
        error: reject,
      });
    });
  });

  it('should generate correct cache key for different endpoints', async () => {
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);

    const context = createMockExecutionContext('POST', '/api/products/123');
    const handler: CallHandler = {
      handle: () => of({ success: true }),
    };

    await interceptor.intercept(context, handler);

    expect(mockCacheService.get).toHaveBeenCalledWith('cache:POST:/api/products/123');
  });

  it('should handle different HTTP methods', async () => {
    mockCacheService.get.mockResolvedValue(null);

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    for (const method of methods) {
      mockCacheService.get.mockClear();
      const context = createMockExecutionContext(method, '/api/test');
      const handler: CallHandler = {
        handle: () => of({}),
      };

      await interceptor.intercept(context, handler);

      expect(mockCacheService.get).toHaveBeenCalledWith(`cache:${method}:/api/test`);
    }
  });
});
