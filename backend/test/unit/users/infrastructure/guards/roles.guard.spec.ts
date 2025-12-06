import { RolesGuard, ROLES_KEY } from '@modules/users/infrastructure/guards/roles.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
        getResponse: jest.fn(),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const context = createMockExecutionContext({ role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      const context = createMockExecutionContext({ role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const context = createMockExecutionContext({ userId: '123', email: 'test@example.com', role: 'ADMIN' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const context = createMockExecutionContext({ userId: '123', email: 'test@example.com', role: 'ORGANIZER' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'ORGANIZER']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not attached to request', () => {
      const context = createMockExecutionContext(undefined);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      expect(() => guard.canActivate(context))
        .toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no role', () => {
      const context = createMockExecutionContext({ userId: '123', email: 'test@example.com' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      expect(() => guard.canActivate(context))
        .toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user role is not in required roles', () => {
      const context = createMockExecutionContext({ userId: '123', email: 'test@example.com', role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      expect(() => guard.canActivate(context))
        .toThrow(new ForbiddenException('Insufficient permissions'));
    });

    it('should be case-insensitive for role comparison', () => {
      const context = createMockExecutionContext({ userId: '123', email: 'test@example.com', role: 'admin' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should check roles from both handler and class', () => {
      const context = createMockExecutionContext({ userId: '123', email: 'test@example.com', role: 'ADMIN' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});
