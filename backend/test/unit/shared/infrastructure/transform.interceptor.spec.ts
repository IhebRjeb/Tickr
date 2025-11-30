import { ExecutionContext, CallHandler } from '@nestjs/common';
import { TransformInterceptor } from '@shared/infrastructure/common/interceptors/transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

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

  const mockCallHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  it('should transform response to standard format', (done) => {
    const data = { id: 1, name: 'test' };
    const context = mockExecutionContext();
    const handler = mockCallHandler(data);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'test' },
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should handle null data', (done) => {
    const context = mockExecutionContext();
    const handler = mockCallHandler(null);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: null,
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should handle array data', (done) => {
    const data = [{ id: 1 }, { id: 2 }];
    const context = mockExecutionContext();
    const handler = mockCallHandler(data);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should include ISO timestamp', (done) => {
    const beforeTest = new Date().toISOString();
    const context = mockExecutionContext();
    const handler = mockCallHandler({});

    interceptor.intercept(context, handler).subscribe((result) => {
      const afterTest = new Date().toISOString();
      expect(result.timestamp >= beforeTest).toBe(true);
      expect(result.timestamp <= afterTest).toBe(true);
      done();
    });
  });
});
