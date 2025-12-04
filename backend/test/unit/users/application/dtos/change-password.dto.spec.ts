import { ChangePasswordDto } from '@modules/users/application/dtos/change-password.dto';
import { validate } from 'class-validator';

describe('ChangePasswordDto', () => {
  describe('currentPassword validation', () => {
    it('should pass with valid current password', async () => {
      const dto = new ChangePasswordDto('OldPass123!', 'NewPass456!');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'currentPassword')).toHaveLength(0);
    });

    it('should fail when current password is empty', async () => {
      const dto = new ChangePasswordDto('', 'NewPass456!');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'currentPassword')).toHaveLength(1);
    });
  });

  describe('newPassword validation', () => {
    it('should pass with valid strong password', async () => {
      const dto = new ChangePasswordDto('OldPass123!', 'NewPass456!');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'newPassword')).toHaveLength(0);
    });

    it('should fail when new password is too short', async () => {
      const dto = new ChangePasswordDto('OldPass123!', 'Ab1!');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'newPassword')).toHaveLength(1);
    });

    it('should fail when new password has no uppercase', async () => {
      const dto = new ChangePasswordDto('OldPass123!', 'newpass123!');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'newPassword')).toHaveLength(1);
    });

    it('should fail when new password has no lowercase', async () => {
      const dto = new ChangePasswordDto('OldPass123!', 'NEWPASS123!');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'newPassword')).toHaveLength(1);
    });

    it('should fail when new password has no number', async () => {
      const dto = new ChangePasswordDto('OldPass123!', 'NewPassword!');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'newPassword')).toHaveLength(1);
    });

    it('should fail when new password has no special character', async () => {
      const dto = new ChangePasswordDto('OldPass123!', 'NewPass123');
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'newPassword')).toHaveLength(1);
    });

    it('should pass with various special characters', async () => {
      const passwords = [
        'NewPass1@',
        'NewPass1#',
        'NewPass1$',
        'NewPass1%',
        'NewPass1!',
      ];

      for (const password of passwords) {
        const dto = new ChangePasswordDto('OldPass123!', password);
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'newPassword')).toHaveLength(0);
      }
    });
  });
});
