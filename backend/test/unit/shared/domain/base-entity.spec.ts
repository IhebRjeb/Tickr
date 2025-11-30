import { BaseEntity } from '@shared/domain/base-entity';
import { DomainEvent } from '@shared/domain/domain-event.base';

// Concrete implementation for testing
class TestEntity extends BaseEntity<TestEntity> {
  constructor(
    id: string,
    public readonly name: string,
    createdAt?: Date,
  ) {
    super(id, createdAt);
  }

  clone(): TestEntity {
    return new TestEntity(this.id, this.name, this.createdAt);
  }

  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }
  }

  changeName(newName: string): void {
    this.touch();
    this.addDomainEvent(new TestNameChangedEvent(this.id, newName));
  }

  addTestEvent(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

class TestNameChangedEvent extends DomainEvent {
  constructor(
    public readonly entityId: string,
    public readonly newName: string,
  ) {
    super();
  }
}

describe('BaseEntity', () => {
  describe('constructor', () => {
    it('should create entity with id and timestamps', () => {
      const entity = new TestEntity('123', 'Test Name');

      expect(entity.id).toBe('123');
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept custom createdAt date', () => {
      const customDate = new Date('2024-01-01');
      const entity = new TestEntity('123', 'Test', customDate);

      expect(entity.createdAt).toEqual(customDate);
    });

    it('should throw error for empty id', () => {
      expect(() => new TestEntity('', 'Test')).toThrow('Entity ID cannot be empty');
      expect(() => new TestEntity('   ', 'Test')).toThrow('Entity ID cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const entity1 = new TestEntity('123', 'Name 1');
      const entity2 = new TestEntity('123', 'Name 2');

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should return false for different ids', () => {
      const entity1 = new TestEntity('123', 'Test');
      const entity2 = new TestEntity('456', 'Test');

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      const entity = new TestEntity('123', 'Test');

      expect(entity.equals(null as unknown as TestEntity)).toBe(false);
      expect(entity.equals(undefined)).toBe(false);
    });

    it('should return false for non-entity objects', () => {
      const entity = new TestEntity('123', 'Test');

      expect(entity.equals({ id: '123' } as unknown as TestEntity)).toBe(false);
    });
  });

  describe('touch', () => {
    it('should update updatedAt timestamp', async () => {
      const entity = new TestEntity('123', 'Test');
      const originalUpdatedAt = entity.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      entity.changeName('New Name');

      expect(entity.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('domain events', () => {
    it('should start with no domain events', () => {
      const entity = new TestEntity('123', 'Test');

      expect(entity.domainEvents).toHaveLength(0);
    });

    it('should add domain events', () => {
      const entity = new TestEntity('123', 'Test');
      entity.changeName('New Name');

      expect(entity.domainEvents).toHaveLength(1);
      expect(entity.domainEvents[0]).toBeInstanceOf(TestNameChangedEvent);
    });

    it('should pull and clear domain events', () => {
      const entity = new TestEntity('123', 'Test');
      entity.changeName('New Name');

      const events = entity.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(entity.domainEvents).toHaveLength(0);
    });

    it('should clear domain events', () => {
      const entity = new TestEntity('123', 'Test');
      entity.changeName('New Name');
      entity.clearDomainEvents();

      expect(entity.domainEvents).toHaveLength(0);
    });

    it('should return copy of domain events (immutability)', () => {
      const entity = new TestEntity('123', 'Test');
      entity.changeName('New Name');

      const events1 = entity.domainEvents;
      const events2 = entity.domainEvents;

      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });

  describe('clone', () => {
    it('should create a copy of the entity', () => {
      const entity = new TestEntity('123', 'Test');
      const cloned = entity.clone();

      expect(cloned.id).toBe(entity.id);
      expect(cloned.name).toBe(entity.name);
      expect(cloned).not.toBe(entity);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid entity', () => {
      const entity = new TestEntity('123', 'Valid Name');

      expect(() => entity.validate()).not.toThrow();
    });

    it('should throw for invalid entity', () => {
      const entity = new TestEntity('123', '');

      expect(() => entity.validate()).toThrow('Name cannot be empty');
    });
  });
});
