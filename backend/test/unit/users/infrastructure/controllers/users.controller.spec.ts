import { ChangePasswordHandler } from '@modules/users/application/commands/change-password.handler';
import { DeactivateUserHandler } from '@modules/users/application/commands/deactivate-user.handler';
import { UpdateProfileHandler } from '@modules/users/application/commands/update-profile.handler';
import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import { GetUserByIdHandler } from '@modules/users/application/queries/get-user-by-id.handler';
import { GetUsersByRoleHandler } from '@modules/users/application/queries/get-users-by-role.handler';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { UsersController } from '@modules/users/infrastructure/controllers/users.controller';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '@shared/domain/result';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUserRepository: any;
  let mockChangePasswordHandler: any;
  let mockUpdateProfileHandler: any;
  let mockDeactivateUserHandler: any;
  let mockGetUserByIdHandler: any;
  let mockGetUsersByRoleHandler: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PARTICIPANT,
    phone: '+1234567890',
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockUserDto = {
    id: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    role: mockUser.role,
    phone: mockUser.phone,
    isActive: mockUser.isActive,
  };

  const currentUser = {
    userId: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
  };

  beforeEach(async () => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      findActiveUsers: jest.fn(),
    };

    mockChangePasswordHandler = {
      execute: jest.fn(),
    };

    mockUpdateProfileHandler = {
      execute: jest.fn(),
    };

    mockDeactivateUserHandler = {
      execute: jest.fn(),
    };

    mockGetUserByIdHandler = {
      execute: jest.fn(),
    };

    mockGetUsersByRoleHandler = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: ChangePasswordHandler, useValue: mockChangePasswordHandler },
        { provide: UpdateProfileHandler, useValue: mockUpdateProfileHandler },
        { provide: DeactivateUserHandler, useValue: mockDeactivateUserHandler },
        { provide: GetUserByIdHandler, useValue: mockGetUserByIdHandler },
        { provide: GetUsersByRoleHandler, useValue: mockGetUsersByRoleHandler },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await controller.getMyProfile(currentUser);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.firstName).toBe(mockUser.firstName);
      expect(result.lastName).toBe(mockUser.lastName);
      expect(result.role).toBe(mockUser.role);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(currentUser.userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(controller.getMyProfile(currentUser))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    const updateDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+9876543210',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockUpdateProfileHandler.execute.mockResolvedValue(Result.ok(mockUserDto));
      mockUserRepository.findById.mockResolvedValue(updatedUser);

      const result = await controller.updateMyProfile(currentUser, updateDto);

      expect(result.firstName).toBe(updatedUser.firstName);
      expect(result.lastName).toBe(updatedUser.lastName);
      expect(result.phone).toBe(updatedUser.phone);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUpdateProfileHandler.execute.mockResolvedValue(
        Result.fail({ type: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.updateMyProfile(currentUser, updateDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for validation errors', async () => {
      mockUpdateProfileHandler.execute.mockResolvedValue(
        Result.fail({ type: 'VALIDATION_ERROR', message: 'Invalid data' }),
      );

      await expect(controller.updateMyProfile(currentUser, updateDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('changeMyPassword', () => {
    const changePasswordDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    };

    it('should change password successfully', async () => {
      mockChangePasswordHandler.execute.mockResolvedValue(Result.okVoid());

      const result = await controller.changeMyPassword(currentUser, changePasswordDto);

      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      mockChangePasswordHandler.execute.mockResolvedValue(
        Result.fail({ type: 'INVALID_CURRENT_PASSWORD', message: 'Invalid password' }),
      );

      await expect(controller.changeMyPassword(currentUser, changePasswordDto))
        .rejects.toThrow(new BadRequestException('Current password is incorrect'));
    });

    it('should throw BadRequestException for weak password', async () => {
      mockChangePasswordHandler.execute.mockResolvedValue(
        Result.fail({ type: 'WEAK_PASSWORD', message: 'Password too weak' }),
      );

      await expect(controller.changeMyPassword(currentUser, changePasswordDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is same as current', async () => {
      mockChangePasswordHandler.execute.mockResolvedValue(
        Result.fail({ type: 'SAME_PASSWORD', message: 'Same password' }),
      );

      await expect(controller.changeMyPassword(currentUser, changePasswordDto))
        .rejects.toThrow(new BadRequestException('New password must be different from current password'));
    });
  });

  describe('deactivateMyAccount', () => {
    it('should deactivate account successfully', async () => {
      mockDeactivateUserHandler.execute.mockResolvedValue(Result.okVoid());

      const result = await controller.deactivateMyAccount(currentUser);

      expect(result).toEqual({ message: 'Account deactivated successfully' });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDeactivateUserHandler.execute.mockResolvedValue(
        Result.fail({ type: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.deactivateMyAccount(currentUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already deactivated', async () => {
      mockDeactivateUserHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ALREADY_DEACTIVATED', message: 'Already deactivated' }),
      );

      await expect(controller.deactivateMyAccount(currentUser))
        .rejects.toThrow(new BadRequestException('Account is already deactivated'));
    });
  });

  describe('getUserById (Admin only)', () => {
    it('should return user by ID', async () => {
      mockGetUserByIdHandler.execute.mockResolvedValue(mockUserDto);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await controller.getUserById(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockGetUserByIdHandler.execute.mockResolvedValue(null);

      await expect(controller.getUserById('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getUsers (Admin only)', () => {
    const paginatedResult = {
      data: [mockUser],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    it('should return paginated user list', async () => {
      mockUserRepository.findActiveUsers.mockResolvedValue(paginatedResult);

      const result = await controller.getUsers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter by role when specified', async () => {
      const paginatedRoleResult = {
        data: [mockUserDto],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockGetUsersByRoleHandler.execute.mockResolvedValue(paginatedRoleResult);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await controller.getUsers({ page: 1, limit: 10, role: UserRole.ADMIN });

      expect(mockGetUsersByRoleHandler.execute).toHaveBeenCalled();
    });

    it('should use default pagination values', async () => {
      mockUserRepository.findActiveUsers.mockResolvedValue(paginatedResult);

      const result = await controller.getUsers({});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should enforce maximum limit', async () => {
      mockUserRepository.findActiveUsers.mockResolvedValue(paginatedResult);

      await controller.getUsers({ limit: 500 });

      // Limit should be capped at 100
      expect(mockUserRepository.findActiveUsers).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    it('should enforce minimum page number', async () => {
      mockUserRepository.findActiveUsers.mockResolvedValue(paginatedResult);

      const result = await controller.getUsers({ page: 0 });

      expect(result.meta.page).toBe(1);
    });
  });
});
