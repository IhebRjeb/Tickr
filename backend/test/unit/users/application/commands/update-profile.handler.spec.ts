import { UpdateProfileCommand } from '@modules/users/application/commands/update-profile.command';
import { UpdateProfileHandler } from '@modules/users/application/commands/update-profile.handler';
import { UserRepositoryPort, UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('UpdateProfileHandler', () => {
  let handler: UpdateProfileHandler;
  let mockRepository: jest.Mocked<UserRepositoryPort>;

  const mockUser: UserEntityPort = {
    id: 'user-123',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PARTICIPANT,
    phone: '+21622345678',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByRole: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      existsByEmail: jest.fn(),
      countByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      updateLastLogin: jest.fn(),
      updateEmailVerified: jest.fn(),
      updatePassword: jest.fn(),
    };

    handler = new UpdateProfileHandler(mockRepository);
  });

  describe('execute', () => {
    it('should update profile successfully with all fields', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+21633456789',
      });

      const command = new UpdateProfileCommand(
        'user-123',
        'Jane',
        'Smith',
        '+21633456789',
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.firstName).toBe('Jane');
      expect(result.value.lastName).toBe('Smith');
      expect(result.value.phone).toBe('+21633456789');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update only firstName', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      const command = new UpdateProfileCommand('user-123', 'Jane');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.firstName).toBe('Jane');
      expect(result.value.lastName).toBe('Doe'); // unchanged
    });

    it('should clear phone when set to null', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        phone: null,
      });

      const command = new UpdateProfileCommand(
        'user-123',
        undefined,
        undefined,
        null,
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.phone).toBeNull();
    });

    it('should fail when no changes provided', async () => {
      const command = new UpdateProfileCommand('user-123');

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NO_CHANGES');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const command = new UpdateProfileCommand('user-123', 'Jane');

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_NOT_FOUND');
    });

    it('should handle repository save error', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const command = new UpdateProfileCommand('user-123', 'Jane');

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
      expect(result.error.message).toContain('Database error');
    });

    it('should exclude sensitive data from response', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const command = new UpdateProfileCommand('user-123', 'Jane');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      // UserDto should not contain password or other sensitive fields
      expect(result.value).not.toHaveProperty('passwordHash');
      expect(result.value).not.toHaveProperty('refreshToken');
    });
  });
});
