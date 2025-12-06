import { GetUserByEmailQuery } from '@modules/users/application/queries/get-user-by-email.query';

describe('GetUserByEmailQuery', () => {
  describe('constructor', () => {
    it('should create query with email', () => {
      const query = new GetUserByEmailQuery('john@example.com');

      expect(query.email).toBe('john@example.com');
      expect(query.timestamp).toBeInstanceOf(Date);
    });

    it('should be immutable', () => {
      const query = new GetUserByEmailQuery('john@example.com');

      expect(() => {
        (query as { email: string }).email = 'jane@example.com';
      }).toThrow();
    });
  });
});
