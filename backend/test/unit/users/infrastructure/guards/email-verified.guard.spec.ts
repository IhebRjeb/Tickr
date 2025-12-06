import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import {
  EmailVerifiedGuard,
  REQUIRE_EMAIL_VERIFIED_KEY,
} from '@modules/users/infrastructure/guards/email-verified.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

describe('EmailVerifiedGuard', () => {
  let guard: EmailVerifiedGuard;
  let reflector: Reflector;
  let mockUserRepository: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PARTICIPANT,
    phone: null,
    isActive: true,
    emailVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    mockUserRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerifiedGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    guard = module.get<EmailVerifiedGuard>(EmailVerifiedGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when @SkipEmailVerification() is used', async () => {
      const context = createMockExecutionContext({ userId: '123' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when no user is attached', async () => {
      const context = createMockExecutionContext(undefined);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      await expect(guard.canActivate(context))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not found in repository', async () => {
      const context = createMockExecutionContext({ userId: '123', email: 'test@example.com', role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(guard.canActivate(context))
        .rejects.toThrow(new ForbiddenException('User not found'));
    });

    it('should allow access when user email is verified', async () => {
      const context = createMockExecutionContext({ userId: mockUser.id, email: 'test@example.com', role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user email is not verified', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      const context = createMockExecutionContext({ userId: mockUser.id, email: 'test@example.com', role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      mockUserRepository.findById.mockResolvedValue(unverifiedUser);

      await expect(guard.canActivate(context))
        .rejects.toThrow(new ForbiddenException('Email verification required. Please verify your email address.'));
    });

    it('should check REQUIRE_EMAIL_VERIFIED_KEY from both handler and class', async () => {
      const context = createMockExecutionContext({ userId: mockUser.id, email: 'test@example.com', role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        REQUIRE_EMAIL_VERIFIED_KEY,
        [context.getHandler(), context.getClass()],
      );
    });

    it('should default to verified when emailVerified field is missing', async () => {
      const userWithoutEmailVerified = { ...mockUser };
      delete (userWithoutEmailVerified as any).emailVerified;
      
      const context = createMockExecutionContext({ userId: mockUser.id, email: 'test@example.com', role: 'PARTICIPANT' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      mockUserRepository.findById.mockResolvedValue(userWithoutEmailVerified);

      const result = await guard.canActivate(context);

      // Should default to true (verified) when field is missing
      expect(result).toBe(true);
    });
  });
});
