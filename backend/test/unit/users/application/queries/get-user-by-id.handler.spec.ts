import { UserRepositoryPort, UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { GetUserByIdHandler } from '@modules/users/application/queries/get-user-by-id.handler';
import { GetUserByIdQuery } from '@modules/users/application/queries/get-user-by-id.query';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('GetUserByIdHandler', () => {
  let handler: GetUserByIdHandler;
  let mockRepository: jest.Mocked<UserRepositoryPort>;

  const mockUser: UserEntityPort = {
    id: 'user-123',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PARTICIPANT,
    phone: '+21622345678',
    isActive: true,
    lastLoginAt: new Date('2024-06-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
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

    handler = new GetUserByIdHandler(mockRepository);
  });

  describe('execute', () => {
    it('should return UserDto when user found', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);

      const query = new GetUserByIdQuery('user-123');
      const result = await handler.execute(query);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-123');
      expect(result!.email).toBe('john@example.com');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
      expect(result!.role).toBe(UserRole.PARTICIPANT);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return null when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const query = new GetUserByIdQuery('user-999');
      const result = await handler.execute(query);

      expect(result).toBeNull();
    });

    it('should exclude sensitive data from response', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);

      const query = new GetUserByIdQuery('user-123');
      const result = await handler.execute(query);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('lastLoginAt'); // Not in UserDto, only in UserProfileDto
    });
  });
});
