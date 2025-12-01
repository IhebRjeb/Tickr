import { GetUsersByRoleQuery } from '@modules/users/application/queries/get-users-by-role.query';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';

describe('GetUsersByRoleQuery', () => {
  describe('constructor', () => {
    it('should create query with role and default pagination', () => {
      const query = new GetUsersByRoleQuery(UserRole.PARTICIPANT);

      expect(query.role).toBe(UserRole.PARTICIPANT);
      expect(query.page).toBe(1);
      expect(query.limit).toBe(10);
      expect(query.timestamp).toBeInstanceOf(Date);
    });

    it('should create query with custom pagination', () => {
      const query = new GetUsersByRoleQuery(UserRole.ORGANIZER, 2, 25);

      expect(query.role).toBe(UserRole.ORGANIZER);
      expect(query.page).toBe(2);
      expect(query.limit).toBe(25);
    });

    it('should be immutable', () => {
      const query = new GetUsersByRoleQuery(UserRole.ADMIN);

      expect(() => {
        (query as { page: number }).page = 5;
      }).toThrow();
    });
  });

  describe('paginationOptions', () => {
    it('should return pagination options object', () => {
      const query = new GetUsersByRoleQuery(UserRole.PARTICIPANT, 3, 20);

      expect(query.paginationOptions).toEqual({
        page: 3,
        limit: 20,
      });
    });
  });
});
