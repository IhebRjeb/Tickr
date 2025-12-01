import { GetUserByIdQuery } from '@modules/users/application/queries/get-user-by-id.query';

describe('GetUserByIdQuery', () => {
  describe('constructor', () => {
    it('should create query with userId', () => {
      const query = new GetUserByIdQuery('user-123');

      expect(query.userId).toBe('user-123');
      expect(query.timestamp).toBeInstanceOf(Date);
    });

    it('should be immutable', () => {
      const query = new GetUserByIdQuery('user-123');

      expect(() => {
        (query as { userId: string }).userId = 'user-456';
      }).toThrow();
    });
  });
});
