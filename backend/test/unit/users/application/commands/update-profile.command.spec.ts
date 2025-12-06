import { UpdateProfileCommand } from '@modules/users/application/commands/update-profile.command';

describe('UpdateProfileCommand', () => {
  describe('constructor', () => {
    it('should create command with all fields', () => {
      const command = new UpdateProfileCommand(
        'user-123',
        'John',
        'Doe',
        '+21622345678',
      );

      expect(command.userId).toBe('user-123');
      expect(command.firstName).toBe('John');
      expect(command.lastName).toBe('Doe');
      expect(command.phone).toBe('+21622345678');
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should create command with only userId', () => {
      const command = new UpdateProfileCommand('user-123');

      expect(command.userId).toBe('user-123');
      expect(command.firstName).toBeUndefined();
      expect(command.lastName).toBeUndefined();
      expect(command.phone).toBeUndefined();
    });

    it('should create command with partial fields', () => {
      const command = new UpdateProfileCommand(
        'user-123',
        'John',
        undefined,
        null,
      );

      expect(command.firstName).toBe('John');
      expect(command.lastName).toBeUndefined();
      expect(command.phone).toBeNull();
    });

    it('should be immutable', () => {
      const command = new UpdateProfileCommand('user-123', 'John');

      expect(() => {
        (command as { firstName: string }).firstName = 'Jane';
      }).toThrow();
    });
  });

  describe('hasChanges', () => {
    it('should return true when firstName is provided', () => {
      const command = new UpdateProfileCommand('user-123', 'John');
      expect(command.hasChanges()).toBe(true);
    });

    it('should return true when lastName is provided', () => {
      const command = new UpdateProfileCommand('user-123', undefined, 'Doe');
      expect(command.hasChanges()).toBe(true);
    });

    it('should return true when phone is provided', () => {
      const command = new UpdateProfileCommand(
        'user-123',
        undefined,
        undefined,
        '+21622345678',
      );
      expect(command.hasChanges()).toBe(true);
    });

    it('should return true when phone is null (clearing)', () => {
      const command = new UpdateProfileCommand(
        'user-123',
        undefined,
        undefined,
        null,
      );
      expect(command.hasChanges()).toBe(true);
    });

    it('should return false when no changes', () => {
      const command = new UpdateProfileCommand('user-123');
      expect(command.hasChanges()).toBe(false);
    });
  });
});
