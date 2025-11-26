import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { CacheService } from './cache.service';

export interface CacheOptions {
  key: string;
  ttl?: number;
}

/**
 * Cache Interceptor
 * 
 * Automatically caches responses based on request
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    const cachedValue = await this.cacheService.get(cacheKey);
    if (cachedValue) {
      return of(cachedValue);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response);
      }),
    );
  }

  private generateCacheKey(request: { method: string; url: string }): string {
    return `cache:${request.method}:${request.url}`;
  }
}
