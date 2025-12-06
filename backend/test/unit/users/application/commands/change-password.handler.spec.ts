import { ChangePasswordCommand } from '@modules/users/application/commands/change-password.command';
import { ChangePasswordHandler } from '@modules/users/application/commands/change-password.handler';
import { UserRepositoryPort, UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('ChangePasswordHandler', () => {
  let handler: ChangePasswordHandler;
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

    handler = new ChangePasswordHandler(mockRepository);
  });

  describe('execute', () => {
    it('should change password successfully with valid new password', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'NewPass456!',
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'NewPass456!',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_NOT_FOUND');
    });

    it('should fail when new password is too weak - no uppercase', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);

      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'newpass123!', // no uppercase
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('WEAK_PASSWORD');
    });

    it('should fail when new password is too weak - no number', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);

      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'NewPassword!', // no number
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('WEAK_PASSWORD');
    });

    it('should fail when new password is too weak - no special char', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);

      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'NewPass123', // no special char
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('WEAK_PASSWORD');
    });

    it('should fail when new password is too short', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);

      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'Ab1!', // too short
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('WEAK_PASSWORD');
    });

    it('should handle repository save error', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'NewPass456!',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
