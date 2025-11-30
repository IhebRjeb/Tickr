import { BaseCommand } from '@shared/application/interfaces/command.interface';
import { BaseQuery } from '@shared/application/interfaces/query.interface';
import { IRepository, IPaginatedRepository, PaginationOptions, PaginatedResult } from '@shared/application/interfaces/repository.interface';
import { IUseCase } from '@shared/application/interfaces/use-case.interface';

describe('Application Interfaces', () => {
  describe('ICommand', () => {
    it('should define timestamp property', () => {
      class TestCommand extends BaseCommand {
        constructor(public readonly data: string) {
          super();
        }
      }

      const command = new TestCommand('test');

      expect(command.timestamp).toBeInstanceOf(Date);
      expect(command.data).toBe('test');
    });
  });

  describe('IQuery', () => {
    it('should define timestamp property', () => {
      class TestQuery extends BaseQuery<string> {
        constructor(public readonly id: string) {
          super();
        }
      }

      const query = new TestQuery('123');

      expect(query.timestamp).toBeInstanceOf(Date);
      expect(query.id).toBe('123');
    });
  });

  describe('IUseCase', () => {
    it('should define execute method', async () => {
      class TestUseCase implements IUseCase<string, number> {
        async execute(input: string): Promise<number> {
          return input.length;
        }
      }

      const useCase = new TestUseCase();
      const result = await useCase.execute('hello');

      expect(result).toBe(5);
    });
  });

  describe('IRepository', () => {
    it('should define CRUD operations', async () => {
      interface TestEntity {
        id: string;
        name: string;
      }

      class TestRepository implements IRepository<TestEntity> {
        private store = new Map<string, TestEntity>();

        async findById(id: string): Promise<TestEntity | null> {
          return this.store.get(id) ?? null;
        }

        async save(entity: TestEntity): Promise<TestEntity> {
          this.store.set(entity.id, entity);
          return entity;
        }

        async delete(id: string): Promise<void> {
          this.store.delete(id);
        }

        async exists(id: string): Promise<boolean> {
          return this.store.has(id);
        }
      }

      const repo = new TestRepository();
      const entity: TestEntity = { id: '1', name: 'Test' };

      await repo.save(entity);
      expect(await repo.exists('1')).toBe(true);
      expect(await repo.findById('1')).toEqual(entity);
      
      await repo.delete('1');
      expect(await repo.exists('1')).toBe(false);
    });
  });

  describe('IPaginatedRepository', () => {
    it('should define paginated operations', async () => {
      interface TestEntity {
        id: string;
        name: string;
      }

      class TestPaginatedRepository implements IPaginatedRepository<TestEntity> {
        private store = new Map<string, TestEntity>();

        async findById(id: string): Promise<TestEntity | null> {
          return this.store.get(id) ?? null;
        }

        async save(entity: TestEntity): Promise<TestEntity> {
          this.store.set(entity.id, entity);
          return entity;
        }

        async delete(id: string): Promise<void> {
          this.store.delete(id);
        }

        async exists(id: string): Promise<boolean> {
          return this.store.has(id);
        }

        async findAll(options?: PaginationOptions): Promise<PaginatedResult<TestEntity>> {
          const entities = Array.from(this.store.values());
          const page = options?.page ?? 1;
          const limit = options?.limit ?? 10;
          const total = entities.length;
          const totalPages = Math.ceil(total / limit);

          return {
            data: entities.slice((page - 1) * limit, page * limit),
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          };
        }

        async count(): Promise<number> {
          return this.store.size;
        }
      }

      const repo = new TestPaginatedRepository();
      
      await repo.save({ id: '1', name: 'Test 1' });
      await repo.save({ id: '2', name: 'Test 2' });
      
      const result = await repo.findAll({ page: 1, limit: 10 });
      
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(await repo.count()).toBe(2);
    });
  });
});
