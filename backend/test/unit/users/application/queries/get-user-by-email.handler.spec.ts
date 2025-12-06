import { UserRepositoryPort, UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { GetUserByEmailHandler } from '@modules/users/application/queries/get-user-by-email.handler';
import { GetUserByEmailQuery } from '@modules/users/application/queries/get-user-by-email.query';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('GetUserByEmailHandler', () => {
  let handler: GetUserByEmailHandler;
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

    handler = new GetUserByEmailHandler(mockRepository);
  });

  describe('execute', () => {
    it('should return UserDto when user found by email', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);

      const query = new GetUserByEmailQuery('john@example.com');
      const result = await handler.execute(query);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-123');
      expect(result!.email).toBe('john@example.com');
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('should return null when email not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      const query = new GetUserByEmailQuery('notfound@example.com');
      const result = await handler.execute(query);

      expect(result).toBeNull();
    });

    it('should search with exact email provided', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      const query = new GetUserByEmailQuery('USER@EXAMPLE.COM');
      await handler.execute(query);

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('USER@EXAMPLE.COM');
    });
  });
});
