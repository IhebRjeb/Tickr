import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logging Interceptor
 * 
 * Logs all HTTP requests and responses
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const now = Date.now();

    const userId = user?.id ?? 'anonymous';

    this.logger.log(`→ ${method} ${url} [User: ${userId}]`);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          this.logger.log(`← ${method} ${url} ${response.statusCode} ${delay}ms`);
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(`← ${method} ${url} ${error.status || 500} ${delay}ms`);
        },
      }),
    );
  }
}
