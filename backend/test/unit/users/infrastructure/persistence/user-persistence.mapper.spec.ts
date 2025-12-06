import { UserRole } from '../../../../../src/modules/users/domain/value-objects/user-role.vo';
import { UserEntity } from '../../../../../src/modules/users/infrastructure/persistence/entities/user.orm-entity';
import { UserPersistenceMapper } from '../../../../../src/modules/users/infrastructure/persistence/mappers/user-persistence.mapper';

describe('UserPersistenceMapper', () => {
  let mapper: UserPersistenceMapper;

  beforeEach(() => {
    mapper = new UserPersistenceMapper();
  });

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

  describe('toDomain', () => {
    it('should convert entity to domain port', () => {
      const entity = createMockUserEntity();

      const result = mapper.toDomain(entity);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: '+33612345678',
        isActive: true,
        lastLoginAt: new Date('2024-06-01T10:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-06-01T10:00:00Z'),
      });
    });

    it('should handle null phone', () => {
      const entity = createMockUserEntity({ phone: null });

      const result = mapper.toDomain(entity);

      expect(result.phone).toBeNull();
    });

    it('should handle null lastLoginAt', () => {
      const entity = createMockUserEntity({ lastLoginAt: null });

      const result = mapper.toDomain(entity);

      expect(result.lastLoginAt).toBeNull();
    });

    it('should not include sensitive fields like passwordHash', () => {
      const entity = createMockUserEntity();

      const result = mapper.toDomain(entity);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('isOrganizer');
      expect(result).not.toHaveProperty('emailVerified');
      expect(result).not.toHaveProperty('phoneVerified');
    });

    it('should handle ADMIN role', () => {
      const entity = createMockUserEntity({ role: UserRole.ADMIN });

      const result = mapper.toDomain(entity);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should handle ORGANIZER role', () => {
      const entity = createMockUserEntity({ role: UserRole.ORGANIZER });

      const result = mapper.toDomain(entity);

      expect(result.role).toBe(UserRole.ORGANIZER);
    });

    it('should handle inactive user', () => {
      const entity = createMockUserEntity({ isActive: false });

      const result = mapper.toDomain(entity);

      expect(result.isActive).toBe(false);
    });
  });

  describe('toEntity', () => {
    it('should convert domain to partial entity with all fields', () => {
      const domain = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: '+33612345678',
        isActive: true,
        lastLoginAt: new Date('2024-06-01T10:00:00Z'),
      };

      const result = mapper.toEntity(domain);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: '+33612345678',
        isActive: true,
        lastLoginAt: new Date('2024-06-01T10:00:00Z'),
      });
    });

    it('should only include provided fields', () => {
      const domain = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = mapper.toEntity(domain);

      expect(result).toEqual({
        firstName: 'Jane',
        lastName: 'Smith',
      });
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('role');
    });

    it('should handle undefined id', () => {
      const domain = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toEntity(domain);

      expect(result).not.toHaveProperty('id');
    });

    it('should include null phone when explicitly set', () => {
      const domain = {
        phone: null as string | null,
      };

      const result = mapper.toEntity(domain);

      expect(result.phone).toBeNull();
    });

    it('should include null lastLoginAt when explicitly set', () => {
      const domain = {
        lastLoginAt: null as Date | null,
      };

      const result = mapper.toEntity(domain);

      expect(result.lastLoginAt).toBeNull();
    });

    it('should handle partial update with just id and one field', () => {
      const domain = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: false,
      };

      const result = mapper.toEntity(domain);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: false,
      });
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of entities to domain ports', () => {
      const entities = [
        createMockUserEntity({ id: 'id-1', email: 'user1@example.com' }),
        createMockUserEntity({ id: 'id-2', email: 'user2@example.com' }),
        createMockUserEntity({ id: 'id-3', email: 'user3@example.com' }),
      ];

      const result = mapper.toDomainArray(entities);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('id-1');
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].id).toBe('id-2');
      expect(result[1].email).toBe('user2@example.com');
      expect(result[2].id).toBe('id-3');
      expect(result[2].email).toBe('user3@example.com');
    });

    it('should return empty array for empty input', () => {
      const result = mapper.toDomainArray([]);

      expect(result).toEqual([]);
    });

    it('should handle single entity array', () => {
      const entities = [createMockUserEntity()];

      const result = mapper.toDomainArray(entities);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('toNewEntity', () => {
    it('should create new entity with required fields', () => {
      const data = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
      };

      const result = mapper.toNewEntity(data);

      expect(result).toEqual({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        passwordHash: null,
        phone: null,
        role: UserRole.PARTICIPANT,
        isOrganizer: false,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        lastLoginAt: null,
      });
    });

    it('should set passwordHash when provided', () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedPassword123',
      };

      const result = mapper.toNewEntity(data);

      expect(result.passwordHash).toBe('hashedPassword123');
    });

    it('should set phone when provided', () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+33612345678',
      };

      const result = mapper.toNewEntity(data);

      expect(result.phone).toBe('+33612345678');
    });

    it('should set role when provided', () => {
      const data = {
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      };

      const result = mapper.toNewEntity(data);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should set isOrganizer when provided', () => {
      const data = {
        email: 'organizer@example.com',
        firstName: 'Event',
        lastName: 'Organizer',
        isOrganizer: true,
      };

      const result = mapper.toNewEntity(data);

      expect(result.isOrganizer).toBe(true);
    });

    it('should set all optional fields when provided', () => {
      const data = {
        email: 'full@example.com',
        firstName: 'Full',
        lastName: 'User',
        passwordHash: 'hash123',
        phone: '+33600000000',
        role: UserRole.ORGANIZER,
        isOrganizer: true,
      };

      const result = mapper.toNewEntity(data);

      expect(result).toEqual({
        email: 'full@example.com',
        firstName: 'Full',
        lastName: 'User',
        passwordHash: 'hash123',
        phone: '+33600000000',
        role: UserRole.ORGANIZER,
        isOrganizer: true,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        lastLoginAt: null,
      });
    });

    it('should default to PARTICIPANT role', () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toNewEntity(data);

      expect(result.role).toBe(UserRole.PARTICIPANT);
    });

    it('should set isActive to true by default', () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toNewEntity(data);

      expect(result.isActive).toBe(true);
    });

    it('should set verification flags to false by default', () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toNewEntity(data);

      expect(result.emailVerified).toBe(false);
      expect(result.phoneVerified).toBe(false);
    });
  });
});
