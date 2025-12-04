import { UserRole } from '../../../../../src/modules/users/domain/value-objects/user-role.vo';
import { UserEntity } from '../../../../../src/modules/users/infrastructure/persistence/entities/user.orm-entity';

describe('UserEntity', () => {
  describe('entity instantiation', () => {
    it('should create a user entity with all properties', () => {
      const entity = new UserEntity();
      entity.id = '123e4567-e89b-12d3-a456-426614174000';
      entity.email = 'test@example.com';
      entity.phone = '+33612345678';
      entity.passwordHash = 'hashedPassword123';
      entity.firstName = 'John';
      entity.lastName = 'Doe';
      entity.role = UserRole.PARTICIPANT;
      entity.isOrganizer = false;
      entity.emailVerified = false;
      entity.phoneVerified = false;
      entity.isActive = true;
      entity.lastLoginAt = null;
      entity.createdAt = new Date('2024-01-01');
      entity.updatedAt = new Date('2024-01-01');

      expect(entity.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(entity.email).toBe('test@example.com');
      expect(entity.phone).toBe('+33612345678');
      expect(entity.passwordHash).toBe('hashedPassword123');
      expect(entity.firstName).toBe('John');
      expect(entity.lastName).toBe('Doe');
      expect(entity.role).toBe(UserRole.PARTICIPANT);
      expect(entity.isOrganizer).toBe(false);
      expect(entity.emailVerified).toBe(false);
      expect(entity.phoneVerified).toBe(false);
      expect(entity.isActive).toBe(true);
      expect(entity.lastLoginAt).toBeNull();
      expect(entity.createdAt).toEqual(new Date('2024-01-01'));
      expect(entity.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should allow null phone', () => {
      const entity = new UserEntity();
      entity.phone = null;

      expect(entity.phone).toBeNull();
    });

    it('should allow null passwordHash', () => {
      const entity = new UserEntity();
      entity.passwordHash = null;

      expect(entity.passwordHash).toBeNull();
    });

    it('should allow null lastLoginAt', () => {
      const entity = new UserEntity();
      entity.lastLoginAt = null;

      expect(entity.lastLoginAt).toBeNull();
    });

    it('should allow setting lastLoginAt to a date', () => {
      const entity = new UserEntity();
      const loginDate = new Date('2024-06-15T10:30:00Z');
      entity.lastLoginAt = loginDate;

      expect(entity.lastLoginAt).toEqual(loginDate);
    });
  });

  describe('role values', () => {
    it('should accept ADMIN role', () => {
      const entity = new UserEntity();
      entity.role = UserRole.ADMIN;

      expect(entity.role).toBe(UserRole.ADMIN);
    });

    it('should accept ORGANIZER role', () => {
      const entity = new UserEntity();
      entity.role = UserRole.ORGANIZER;

      expect(entity.role).toBe(UserRole.ORGANIZER);
    });

    it('should accept PARTICIPANT role', () => {
      const entity = new UserEntity();
      entity.role = UserRole.PARTICIPANT;

      expect(entity.role).toBe(UserRole.PARTICIPANT);
    });
  });

  describe('boolean flags', () => {
    it('should handle isOrganizer flag', () => {
      const entity = new UserEntity();
      
      entity.isOrganizer = true;
      expect(entity.isOrganizer).toBe(true);
      
      entity.isOrganizer = false;
      expect(entity.isOrganizer).toBe(false);
    });

    it('should handle emailVerified flag', () => {
      const entity = new UserEntity();
      
      entity.emailVerified = true;
      expect(entity.emailVerified).toBe(true);
      
      entity.emailVerified = false;
      expect(entity.emailVerified).toBe(false);
    });

    it('should handle phoneVerified flag', () => {
      const entity = new UserEntity();
      
      entity.phoneVerified = true;
      expect(entity.phoneVerified).toBe(true);
      
      entity.phoneVerified = false;
      expect(entity.phoneVerified).toBe(false);
    });

    it('should handle isActive flag', () => {
      const entity = new UserEntity();
      
      entity.isActive = true;
      expect(entity.isActive).toBe(true);
      
      entity.isActive = false;
      expect(entity.isActive).toBe(false);
    });
  });

  describe('timestamps', () => {
    it('should store createdAt date', () => {
      const entity = new UserEntity();
      const date = new Date('2024-01-15T08:00:00Z');
      entity.createdAt = date;

      expect(entity.createdAt).toEqual(date);
    });

    it('should store updatedAt date', () => {
      const entity = new UserEntity();
      const date = new Date('2024-06-20T14:30:00Z');
      entity.updatedAt = date;

      expect(entity.updatedAt).toEqual(date);
    });
  });
});
