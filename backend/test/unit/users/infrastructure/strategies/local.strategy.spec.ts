import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { PasswordService } from '@modules/users/infrastructure/services/password.service';
import { LocalStrategy, ValidatedUser } from '@modules/users/infrastructure/strategies/local.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let mockUserRepository: any;
  let mockPasswordService: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PARTICIPANT,
    phone: null,
    passwordHash: 'hashed-password',
    emailVerified: true,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      existsByEmail: jest.fn(),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
    };

    mockPasswordService = {
      compare: jest.fn(),
      hash: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: PasswordService, useValue: mockPasswordService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(null);

      await expect(strategy.validate('unknown@example.com', 'password123'))
        .rejects.toThrow(UnauthorizedException);
      
      expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith('unknown@example.com');
    });

    it('should throw UnauthorizedException when user is deactivated', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(inactiveUser);

      await expect(strategy.validate('test@example.com', 'password123'))
        .rejects.toThrow(new UnauthorizedException('Account is deactivated'));
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(strategy.validate('test@example.com', 'wrong-password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should return validated user when credentials are valid', async () => {
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(result).toEqual<ValidatedUser>({
        userId: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
        emailVerified: true,
      });
    });

    it('should not include sensitive data in validated user', async () => {
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);

      const result = await strategy.validate('test@example.com', 'password123');

      // Should not have password hash or other sensitive fields
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('verificationToken');
    });

    it('should use email as username field', async () => {
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);

      await strategy.validate('test@example.com', 'password123');

      // Verify it's calling findByEmailWithPassword
      expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle different user roles correctly', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(adminUser);
      mockPasswordService.compare.mockResolvedValue(true);

      const result = await strategy.validate('admin@example.com', 'password123');

      expect(result.role).toBe(UserRole.ADMIN);
    });
  });
});
