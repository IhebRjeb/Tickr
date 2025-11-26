import { ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { TimeoutInterceptor } from '@shared/infrastructure/common/interceptors/timeout.interceptor';
import { of, delay } from 'rxjs';

describe('TimeoutInterceptor', () => {
  const mockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
        getNext: () => undefined,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should use default timeout of 30 seconds', () => {
    const interceptor = new TimeoutInterceptor();
    
    // Access private property for testing
    expect((interceptor as unknown as { timeoutMs: number }).timeoutMs).toBe(30000);
  });

  it('should use custom timeout', () => {
    const interceptor = new TimeoutInterceptor(5000);
    
    expect((interceptor as unknown as { timeoutMs: number }).timeoutMs).toBe(5000);
  });

  it('should pass through fast responses', (done) => {
    const interceptor = new TimeoutInterceptor(1000);
    const context = mockExecutionContext();
    const handler: CallHandler = {
      handle: () => of({ data: 'test' }),
    };

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({ data: 'test' });
        done();
      },
      error: done.fail,
    });
  });

  it('should throw RequestTimeoutException for slow responses', (done) => {
    const interceptor = new TimeoutInterceptor(50); // 50ms timeout
    const context = mockExecutionContext();
    const handler: CallHandler = {
      handle: () => of({ data: 'test' }).pipe(delay(100)), // 100ms delay
    };

    interceptor.intercept(context, handler).subscribe({
      next: () => done.fail('Should have timed out'),
      error: (error) => {
        expect(error).toBeInstanceOf(RequestTimeoutException);
        expect(error.message).toBe('Request timeout');
        done();
      },
    });
  });
});
