import { Repository } from 'typeorm';

import { UserEntityPort } from '../../../../../src/modules/users/application/ports/user.repository.port';
import { UserRole } from '../../../../../src/modules/users/domain/value-objects/user-role.vo';
import { UserEntity } from '../../../../../src/modules/users/infrastructure/persistence/entities/user.orm-entity';
import { UserPersistenceMapper } from '../../../../../src/modules/users/infrastructure/persistence/mappers/user-persistence.mapper';
import { UserTypeOrmRepository } from '../../../../../src/modules/users/infrastructure/persistence/repositories/user.typeorm-repository';

describe('UserTypeOrmRepository', () => {
  let repository: UserTypeOrmRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<UserEntity>>;
  let mapper: UserPersistenceMapper;

  const createMockUserEntity = (overrides: Partial<UserEntity> = {}): UserEntity => {
    const entity = new UserEntity();
    entity.id = '123e4567-e89b-12d3-a456-426614174000';
    entity.email = 'test@example.com';
    entity.phone = '+33612345678';
    entity.passwordHash = 'hashedPassword123';
    entity.firstName = 'John';
    entity.lastName = 'Doe';
    entity.role = UserRole.PARTICIPANT;
    entity.isOrganizer = false;
    entity.emailVerified = true;
    entity.phoneVerified = false;
    entity.isActive = true;
    entity.lastLoginAt = new Date('2024-06-01T10:00:00Z');
    entity.createdAt = new Date('2024-01-01T00:00:00Z');
    entity.updatedAt = new Date('2024-06-01T10:00:00Z');
    return Object.assign(entity, overrides);
  };

  beforeEach(() => {
    mockTypeOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;

    mapper = new UserPersistenceMapper();
    repository = new UserTypeOrmRepository(mockTypeOrmRepository, mapper);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const entity = createMockUserEntity();
      mockTypeOrmRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result?.email).toBe('test@example.com');
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
    });

    it('should return null when user not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when email found', async () => {
      const entity = createMockUserEntity();
      mockTypeOrmRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should normalize email to lowercase', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when email not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByRole', () => {
    it('should return paginated users by role', async () => {
      const entities = [
        createMockUserEntity({ id: 'id-1', email: 'admin1@example.com', role: UserRole.ADMIN }),
        createMockUserEntity({ id: 'id-2', email: 'admin2@example.com', role: UserRole.ADMIN }),
      ];
      mockTypeOrmRepository.findAndCount.mockResolvedValue([entities, 2]);

      const result = await repository.findByRole(UserRole.ADMIN);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should apply pagination options', async () => {
      mockTypeOrmRepository.findAndCount.mockResolvedValue([[], 25]);

      await repository.findByRole(UserRole.PARTICIPANT, {
        page: 2,
        limit: 5,
        sortBy: 'lastName',
        sortOrder: 'ASC',
      });

      expect(mockTypeOrmRepository.findAndCount).toHaveBeenCalledWith({
        where: { role: UserRole.PARTICIPANT },
        skip: 5,
        take: 5,
        order: { lastName: 'ASC' },
      });
    });

    it('should calculate pagination correctly', async () => {
      mockTypeOrmRepository.findAndCount.mockResolvedValue([[], 45]);

      const result = await repository.findByRole(UserRole.PARTICIPANT, {
        page: 3,
        limit: 10,
      });

      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should use default sort options', async () => {
      mockTypeOrmRepository.findAndCount.mockResolvedValue([[], 0]);

      await repository.findByRole(UserRole.ORGANIZER);

      expect(mockTypeOrmRepository.findAndCount).toHaveBeenCalledWith({
        where: { role: UserRole.ORGANIZER },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('existsByEmail', () => {
    it('should return true when email exists', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(1);

      const result = await repository.existsByEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockTypeOrmRepository.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return false when email does not exist', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(0);

      const result = await repository.existsByEmail('notfound@example.com');

      expect(result).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(0);

      await repository.existsByEmail('TEST@EXAMPLE.COM');

      expect(mockTypeOrmRepository.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('countByRole', () => {
    it('should return count for specific role', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(42);

      const result = await repository.countByRole(UserRole.PARTICIPANT);

      expect(result).toBe(42);
      expect(mockTypeOrmRepository.count).toHaveBeenCalledWith({
        where: { role: UserRole.PARTICIPANT },
      });
    });

    it('should return zero when no users with role', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(0);

      const result = await repository.countByRole(UserRole.ADMIN);

      expect(result).toBe(0);
    });
  });

  describe('findActiveUsers', () => {
    it('should return paginated active users', async () => {
      const entities = [
        createMockUserEntity({ id: 'id-1', isActive: true }),
        createMockUserEntity({ id: 'id-2', isActive: true }),
      ];
      mockTypeOrmRepository.findAndCount.mockResolvedValue([entities, 2]);

      const result = await repository.findActiveUsers();

      expect(result.data).toHaveLength(2);
      expect(result.data.every((u) => u.isActive)).toBe(true);
    });

    it('should filter only active users', async () => {
      mockTypeOrmRepository.findAndCount.mockResolvedValue([[], 0]);

      await repository.findActiveUsers();

      expect(mockTypeOrmRepository.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should apply pagination options', async () => {
      mockTypeOrmRepository.findAndCount.mockResolvedValue([[], 100]);

      const result = await repository.findActiveUsers({
        page: 5,
        limit: 20,
        sortBy: 'email',
        sortOrder: 'ASC',
      });

      expect(mockTypeOrmRepository.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 80,
        take: 20,
        order: { email: 'ASC' },
      });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(20);
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      mockTypeOrmRepository.update.mockResolvedValue({ affected: 1 } as any);

      const beforeCall = new Date();
      await repository.updateLastLogin('user-id-123');
      const afterCall = new Date();

      expect(mockTypeOrmRepository.update).toHaveBeenCalled();
      const call = mockTypeOrmRepository.update.mock.calls[0];
      expect(call[0]).toBe('user-id-123');
      
      const updateData = call[1] as { lastLoginAt: Date };
      expect(updateData.lastLoginAt).toBeInstanceOf(Date);
      expect(updateData.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(updateData.lastLoginAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('findByPhone', () => {
    it('should return user when phone found', async () => {
      const entity = createMockUserEntity();
      mockTypeOrmRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findByPhone('+33612345678');

      expect(result).not.toBeNull();
      expect(result?.phone).toBe('+33612345678');
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+33612345678' },
      });
    });

    it('should return null when phone not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByPhone('+33600000000');

      expect(result).toBeNull();
    });
  });

  describe('existsByPhone', () => {
    it('should return true when phone exists', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(1);

      const result = await repository.existsByPhone('+33612345678');

      expect(result).toBe(true);
    });

    it('should return false when phone does not exist', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(0);

      const result = await repository.existsByPhone('+33600000000');

      expect(result).toBe(false);
    });
  });

  describe('save', () => {
    it('should save and return user', async () => {
      const domainUser: UserEntityPort = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: '+33612345678',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const savedEntity = createMockUserEntity();
      mockTypeOrmRepository.save.mockResolvedValue(savedEntity);

      const result = await repository.save(domainUser);

      expect(result).not.toBeNull();
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockTypeOrmRepository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete user by id', async () => {
      mockTypeOrmRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await repository.delete('user-id-123');

      expect(mockTypeOrmRepository.delete).toHaveBeenCalledWith('user-id-123');
    });
  });

  describe('exists', () => {
    it('should return true when user exists', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(1);

      const result = await repository.exists('user-id-123');

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(0);

      const result = await repository.exists('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const entities = [
        createMockUserEntity({ id: 'id-1' }),
        createMockUserEntity({ id: 'id-2' }),
      ];
      mockTypeOrmRepository.findAndCount.mockResolvedValue([entities, 2]);

      const result = await repository.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should apply pagination options', async () => {
      mockTypeOrmRepository.findAndCount.mockResolvedValue([[], 50]);

      const result = await repository.findAll({
        page: 3,
        limit: 15,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      expect(mockTypeOrmRepository.findAndCount).toHaveBeenCalledWith({
        skip: 30,
        take: 15,
        order: { createdAt: 'DESC' },
      });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });
  });

  describe('count', () => {
    it('should return total count', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(150);

      const result = await repository.count();

      expect(result).toBe(150);
      expect(mockTypeOrmRepository.count).toHaveBeenCalled();
    });
  });
});
