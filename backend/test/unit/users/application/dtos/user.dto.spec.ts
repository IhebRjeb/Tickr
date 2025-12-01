import { UserDto } from '@modules/users/application/dtos/user.dto';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('UserDto', () => {
  describe('constructor', () => {
    it('should create UserDto with all properties', () => {
      const dto = new UserDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: '+21622345678',
        isActive: true,
      });

      expect(dto.id).toBe('user-123');
      expect(dto.email).toBe('john@example.com');
      expect(dto.firstName).toBe('John');
      expect(dto.lastName).toBe('Doe');
      expect(dto.role).toBe(UserRole.PARTICIPANT);
      expect(dto.phone).toBe('+21622345678');
      expect(dto.isActive).toBe(true);
    });

    it('should handle null phone', () => {
      const dto = new UserDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.ORGANIZER,
        phone: null,
        isActive: true,
      });

      expect(dto.phone).toBeNull();
    });

    it('should handle inactive user', () => {
      const dto = new UserDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: false,
      });

      expect(dto.isActive).toBe(false);
    });
  });

  describe('fullName', () => {
    it('should return full name', () => {
      const dto = new UserDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
      });

      expect(dto.fullName).toBe('John Doe');
    });

    it('should handle multi-word names', () => {
      const dto = new UserDto({
        id: 'user-123',
        email: 'mary@example.com',
        firstName: 'Mary Jane',
        lastName: 'Watson Parker',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
      });

      expect(dto.fullName).toBe('Mary Jane Watson Parker');
    });
  });

  describe('exclusion of sensitive data', () => {
    it('should not have passwordHash property', () => {
      const dto = new UserDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
      });

      expect(dto).not.toHaveProperty('passwordHash');
    });

    it('should not have refreshToken property', () => {
      const dto = new UserDto({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTICIPANT,
        phone: null,
        isActive: true,
      });

      expect(dto).not.toHaveProperty('refreshToken');
    });
  });
});
