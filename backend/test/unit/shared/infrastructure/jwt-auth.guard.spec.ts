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

  it('should allow access for public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    
    const context = mockExecutionContext(null);
    
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access for authenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    
    const context = mockExecutionContext({ id: '123', email: 'test@test.com' });
    
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException for unauthenticated user on protected route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    
    const context = mockExecutionContext(null);
    
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should check IS_PUBLIC_KEY metadata', () => {
    const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    
    const context = mockExecutionContext(null);
    guard.canActivate(context);
    
    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
  });
});
