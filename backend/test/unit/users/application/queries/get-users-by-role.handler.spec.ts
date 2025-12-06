import { UserRepositoryPort, UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { GetUsersByRoleHandler } from '@modules/users/application/queries/get-users-by-role.handler';
import { GetUsersByRoleQuery } from '@modules/users/application/queries/get-users-by-role.query';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { PaginatedResult } from '@shared/application/interfaces/repository.interface';

describe('GetUsersByRoleHandler', () => {
  let handler: GetUsersByRoleHandler;
  let mockRepository: jest.Mocked<UserRepositoryPort>;

  const mockUsers: UserEntityPort[] = [
    {
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.ORGANIZER,
      phone: '+21622345678',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'user-2',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.ORGANIZER,
      phone: null,
      isActive: true,
      lastLoginAt: new Date('2024-06-01'),
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-06-01'),
    },
  ];

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

    handler = new GetUsersByRoleHandler(mockRepository);
  });

  describe('execute', () => {
    it('should return paginated users by role', async () => {
      const paginatedResult: PaginatedResult<UserEntityPort> = {
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockRepository.findByRole.mockResolvedValue(paginatedResult);

      const query = new GetUsersByRoleQuery(UserRole.ORGANIZER);
      const result = await handler.execute(query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.data[0].id).toBe('user-1');
      expect(result.data[1].id).toBe('user-2');
    });

    it('should pass pagination options to repository', async () => {
      const paginatedResult: PaginatedResult<UserEntityPort> = {
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: true,
      };

      mockRepository.findByRole.mockResolvedValue(paginatedResult);

      const query = new GetUsersByRoleQuery(UserRole.PARTICIPANT, 2, 5);
      await handler.execute(query);

      expect(mockRepository.findByRole).toHaveBeenCalledWith(
        UserRole.PARTICIPANT,
        { page: 2, limit: 5 },
      );
    });

    it('should return empty result when no users found', async () => {
      const paginatedResult: PaginatedResult<UserEntityPort> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockRepository.findByRole.mockResolvedValue(paginatedResult);

      const query = new GetUsersByRoleQuery(UserRole.ADMIN);
      const result = await handler.execute(query);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should map users to DTOs', async () => {
      const paginatedResult: PaginatedResult<UserEntityPort> = {
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockRepository.findByRole.mockResolvedValue(paginatedResult);

      const query = new GetUsersByRoleQuery(UserRole.ORGANIZER);
      const result = await handler.execute(query);

      // Verify DTOs don't contain sensitive data
      result.data.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('refreshToken');
      });
    });
  });
});
