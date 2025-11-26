import { ExecutionContext, CallHandler } from '@nestjs/common';
import { LoggingInterceptor } from '@shared/infrastructure/common/interceptors/logging.interceptor';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  const mockExecutionContext = (user?: { id: string }): ExecutionContext => {
    const mockRequest = {
      method: 'GET',
      url: '/api/test',
      user,
    };
    const mockResponse = {
      statusCode: 200,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
        getNext: () => undefined,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request and response for anonymous user', (done) => {
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

  it('should log request and response for authenticated user', (done) => {
    const context = mockExecutionContext({ id: 'user-123' });
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

  it('should log errors', (done) => {
    const context = mockExecutionContext();
    const error = { status: 500, message: 'Internal error' };
    const handler: CallHandler = {
      handle: () => throwError(() => error),
    };

    interceptor.intercept(context, handler).subscribe({
      next: () => done.fail('Should have thrown'),
      error: (err) => {
        expect(err).toEqual(error);
        done();
      },
    });
  });
});
