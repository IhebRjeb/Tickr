import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, IS_PUBLIC_KEY } from '@shared/infrastructure/common/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockExecutionContext = (user: unknown): ExecutionContext => {
    const mockRequest = { user };
    
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => undefined,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow access for public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    
    const context = mockExecutionContext(null);
    
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should delegate authentication for protected routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = mockExecutionContext({ id: '123', email: 'test@test.com' });
    const parentCanActivate = jest.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(guard)),
      'canActivate',
    ).mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
    expect(parentCanActivate).toHaveBeenCalledWith(context);
  });

  it('should throw UnauthorizedException for unauthenticated user on protected route', () => {
    expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
  });

  it('should check IS_PUBLIC_KEY metadata', () => {
    const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    
    const context = mockExecutionContext(null);
    guard.canActivate(context);
    
    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
  });
});
