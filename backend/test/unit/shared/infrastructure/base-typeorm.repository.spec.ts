import { BaseTypeOrmRepository } from '@shared/infrastructure/database/base-typeorm.repository';
import { Repository, ObjectLiteral } from 'typeorm';

// Test domain entity
interface TestDomain {
  id: string;
  name: string;
  createdAt: Date;
}

// Test TypeORM entity
interface TestEntity extends ObjectLiteral {
  id: string;
  name: string;
  created_at: Date;
}

// Concrete implementation for testing
class TestRepository extends BaseTypeOrmRepository<TestDomain, TestEntity> {
  protected toDomain(entity: TestEntity): TestDomain {
    return {
      id: entity.id,
      name: entity.name,
      createdAt: entity.created_at,
    };
  }

  protected toEntity(domain: TestDomain): TestEntity {
    return {
      id: domain.id,
      name: domain.name,
      created_at: domain.createdAt,
    };
  }
}

describe('BaseTypeOrmRepository', () => {
  let repository: TestRepository;
  let mockTypeOrmRepo: Partial<Repository<TestEntity>>;

  const mockEntity: TestEntity = {
    id: '123',
    name: 'Test Entity',
    created_at: new Date('2024-01-01'),
  };

  const mockDomain: TestDomain = {
    id: '123',
    name: 'Test Entity',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockTypeOrmRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
    };

    repository = new TestRepository(mockTypeOrmRepo as Repository<TestEntity>);
  });

  describe('findById', () => {
    it('should return domain entity when found', async () => {
      (mockTypeOrmRepo.findOne as jest.Mock).mockResolvedValue(mockEntity);

      const result = await repository.findById('123');

      expect(result).toEqual(mockDomain);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should return null when not found', async () => {
      (mockTypeOrmRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save and return domain entity', async () => {
      (mockTypeOrmRepo.save as jest.Mock).mockResolvedValue(mockEntity);

      const result = await repository.save(mockDomain);

      expect(result).toEqual(mockDomain);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockDomain.id,
          name: mockDomain.name,
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete entity by id', async () => {
      (mockTypeOrmRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      await repository.delete('123');

      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith('123');
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      (mockTypeOrmRepo.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.exists('123');

      expect(result).toBe(true);
      expect(mockTypeOrmRepo.count).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should return false when entity does not exist', async () => {
      (mockTypeOrmRepo.count as jest.Mock).mockResolvedValue(0);

      const result = await repository.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated results with default options', async () => {
      const entities = [mockEntity, { ...mockEntity, id: '456' }];
      (mockTypeOrmRepo.findAndCount as jest.Mock).mockResolvedValue([entities, 2]);

      const result = await repository.findAll();

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: '123' }),
          expect.objectContaining({ id: '456' }),
        ]),
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should respect pagination options', async () => {
      (mockTypeOrmRepo.findAndCount as jest.Mock).mockResolvedValue([[], 100]);

      const result = await repository.findAll({ page: 3, limit: 20 });

      expect(mockTypeOrmRepo.findAndCount).toHaveBeenCalledWith({
        skip: 40, // (3 - 1) * 20
        take: 20,
        order: undefined,
      });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
    });

    it('should apply sorting when provided', async () => {
      (mockTypeOrmRepo.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await repository.findAll({ sortBy: 'name', sortOrder: 'DESC' });

      expect(mockTypeOrmRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { name: 'DESC' },
      });
    });

    it('should calculate hasNextPage correctly', async () => {
      (mockTypeOrmRepo.findAndCount as jest.Mock).mockResolvedValue([[], 30]);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.hasNextPage).toBe(true);
      expect(result.totalPages).toBe(3);
    });

    it('should calculate hasPreviousPage correctly', async () => {
      (mockTypeOrmRepo.findAndCount as jest.Mock).mockResolvedValue([[], 30]);

      const result = await repository.findAll({ page: 2, limit: 10 });

      expect(result.hasPreviousPage).toBe(true);
    });
  });

  describe('count', () => {
    it('should return total count', async () => {
      (mockTypeOrmRepo.count as jest.Mock).mockResolvedValue(42);

      const result = await repository.count();

      expect(result).toBe(42);
      expect(mockTypeOrmRepo.count).toHaveBeenCalled();
    });
  });
});
