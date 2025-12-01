import { UserProfileDto } from '@modules/users/application/dtos/user-profile.dto';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('UserProfileDto', () => {
  describe('constructor', () => {
    it('should create UserProfileDto with all properties', () => {
      const now = new Date();
      const lastLogin = new Date('2024-06-01');
      const createdAt = new Date('2024-01-01');

      const dto = new UserProfileDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.ORGANIZER,
        phone: '+21622345678',
        isActive: true,
        lastLoginAt: lastLogin,
        createdAt: createdAt,
        updatedAt: now,
      });

      expect(dto.id).toBe('user-123');
      expect(dto.email).toBe('john@example.com');
      expect(dto.firstName).toBe('John');
      expect(dto.lastName).toBe('Doe');
      expect(dto.role).toBe(UserRole.ORGANIZER);
      expect(dto.phone).toBe('+21622345678');
      expect(dto.isActive).toBe(true);
      expect(dto.lastLoginAt).toBe(lastLogin);
      expect(dto.createdAt).toBe(createdAt);
      expect(dto.updatedAt).toBe(now);
    });

    it('should handle null lastLoginAt', () => {
      const dto = new UserProfileDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(dto.lastLoginAt).toBeNull();
    });
  });

  describe('fullName', () => {
    it('should return full name', () => {
      const dto = new UserProfileDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(dto.fullName).toBe('John Doe');
    });
  });

  describe('hasLoggedIn', () => {
    it('should return true when user has logged in', () => {
      const dto = new UserProfileDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
        lastLoginAt: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      });

      expect(dto.hasLoggedIn).toBe(true);
    });

    it('should return false when user has never logged in', () => {
      const dto = new UserProfileDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(dto.hasLoggedIn).toBe(false);
    });
  });

  describe('accountAgeDays', () => {
    it('should calculate account age in days', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dto = new UserProfileDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: thirtyDaysAgo,
        updatedAt: new Date(),
      });

      expect(dto.accountAgeDays).toBeGreaterThanOrEqual(30);
      expect(dto.accountAgeDays).toBeLessThanOrEqual(31);
    });

    it('should return 0 for new account', () => {
      const dto = new UserProfileDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(dto.accountAgeDays).toBe(0);
    });
  });
});
