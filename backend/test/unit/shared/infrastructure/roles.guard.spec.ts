import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from '@shared/infrastructure/common/guards/roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockExecutionContext = (user: { id: string; role: string } | null): ExecutionContext => {
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
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = mockExecutionContext({ id: '123', role: 'user' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const context = mockExecutionContext({ id: '123', role: 'user' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'organizer']);

    const context = mockExecutionContext({ id: '123', role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = mockExecutionContext({ id: '123', role: 'user' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user is not authenticated', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = mockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should check ROLES_KEY metadata', () => {
    const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const context = mockExecutionContext({ id: '123', role: 'user' });
    guard.canActivate(context);

    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });
});
