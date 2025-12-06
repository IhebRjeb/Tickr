import { DeactivateUserCommand } from '@modules/users/application/commands/deactivate-user.command';

describe('DeactivateUserCommand', () => {
  describe('constructor', () => {
    it('should create command with userId', () => {
      const command = new DeactivateUserCommand('user-123');

      expect(command.userId).toBe('user-123');
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should be immutable', () => {
      const command = new DeactivateUserCommand('user-123');

      expect(() => {
        (command as { userId: string }).userId = 'user-456';
      }).toThrow();
    });
  });
});
