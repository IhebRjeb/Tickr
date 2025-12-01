import { ChangePasswordCommand } from '@modules/users/application/commands/change-password.command';

describe('ChangePasswordCommand', () => {
  describe('constructor', () => {
    it('should create command with all required fields', () => {
      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'NewPass456!',
      );

      expect(command.userId).toBe('user-123');
      expect(command.currentPassword).toBe('OldPass123!');
      expect(command.newPassword).toBe('NewPass456!');
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should be immutable', () => {
      const command = new ChangePasswordCommand(
        'user-123',
        'OldPass123!',
        'NewPass456!',
      );

      expect(() => {
        (command as { newPassword: string }).newPassword = 'Changed!';
      }).toThrow();
    });

    it('should preserve exact password values', () => {
      const currentPassword = 'My$pecialP@ss123';
      const newPassword = 'N3w$ecureP@ss!';

      const command = new ChangePasswordCommand(
        'user-123',
        currentPassword,
        newPassword,
      );

      expect(command.currentPassword).toBe(currentPassword);
      expect(command.newPassword).toBe(newPassword);
    });
  });
});
