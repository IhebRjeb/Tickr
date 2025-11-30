import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

/**
 * Timeout Interceptor
 * 
 * Enforces timeout on all requests (default: 30 seconds)
 * Timeout can be configured via REQUEST_TIMEOUT_MS environment variable
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.timeoutMs = this.configService.get<number>('REQUEST_TIMEOUT_MS', 30000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timeout'));
        }
        return throwError(() => err);
      }),
    );
  }
}
