import { DeactivateUserCommand } from '@modules/users/application/commands/deactivate-user.command';
import { DeactivateUserHandler } from '@modules/users/application/commands/deactivate-user.handler';
import { UserRepositoryPort, UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('DeactivateUserHandler', () => {
  let handler: DeactivateUserHandler;
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

    handler = new DeactivateUserHandler(mockRepository);
  });

  describe('execute', () => {
    it('should deactivate user successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockUser, isActive: false });

      const command = new DeactivateUserCommand('user-123');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should fail when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const command = new DeactivateUserCommand('user-123');

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_NOT_FOUND');
    });

    it('should fail when user already deactivated', async () => {
      mockRepository.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const command = new DeactivateUserCommand('user-123');

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ALREADY_DEACTIVATED');
    });

    it('should handle repository save error', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const command = new DeactivateUserCommand('user-123');

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
      expect(result.error.message).toContain('Database error');
    });
  });
});
