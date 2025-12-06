import { WeakPasswordException } from '@modules/users/domain/exceptions/weak-password.exception';
import { HashedPasswordVO } from '@modules/users/domain/value-objects/hashed-password.vo';

describe('HashedPasswordVO Value Object', () => {
  const validPassword = 'SecurePass123!';
  const weakPasswords = {
    tooShort: 'Abc1!',
    noUppercase: 'securepass123!',
    noNumber: 'SecurePass!',
    noSpecial: 'SecurePass123',
  };

  describe('create', () => {
    it('should create a hashed password from valid plain text', async () => {
      const hashedPassword = await HashedPasswordVO.create(validPassword);

      expect(hashedPassword.hash).toBeDefined();
      expect(hashedPassword.hash).not.toBe(validPassword);
      expect(hashedPassword.hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });

    it('should create different hashes for the same password', async () => {
      const hash1 = await HashedPasswordVO.create(validPassword);
      const hash2 = await HashedPasswordVO.create(validPassword);

      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('should accept password meeting all requirements', async () => {
      const passwords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'Test1234!',
        'C0mplex!ty',
        'Ab1!efgh',
      ];

      for (const pwd of passwords) {
        const hashed = await HashedPasswordVO.create(pwd);
        expect(hashed.hash).toBeDefined();
      }
    });
  });

  describe('password policy validation', () => {
    it('should throw WeakPasswordException for password too short', async () => {
      await expect(HashedPasswordVO.create(weakPasswords.tooShort)).rejects.toThrow(
        WeakPasswordException,
      );
    });

    it('should throw WeakPasswordException for password without uppercase', async () => {
      await expect(HashedPasswordVO.create(weakPasswords.noUppercase)).rejects.toThrow(
        WeakPasswordException,
      );
    });

    it('should throw WeakPasswordException for password without number', async () => {
      await expect(HashedPasswordVO.create(weakPasswords.noNumber)).rejects.toThrow(
        WeakPasswordException,
      );
    });

    it('should throw WeakPasswordException for password without special character', async () => {
      await expect(HashedPasswordVO.create(weakPasswords.noSpecial)).rejects.toThrow(
        WeakPasswordException,
      );
    });

    it('should throw WeakPasswordException for empty password', async () => {
      await expect(HashedPasswordVO.create('')).rejects.toThrow(WeakPasswordException);
    });

    it('should include specific reason in exception message', async () => {
      try {
        await HashedPasswordVO.create(weakPasswords.tooShort);
      } catch (error) {
        expect((error as WeakPasswordException).message).toContain('8 characters');
      }
    });
  });

  describe('compare', () => {
    it('should return true for matching password', async () => {
      const hashedPassword = await HashedPasswordVO.create(validPassword);
      const isMatch = await hashedPassword.compare(validPassword);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hashedPassword = await HashedPasswordVO.create(validPassword);
      const isMatch = await hashedPassword.compare('WrongPassword123!');

      expect(isMatch).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hashedPassword = await HashedPasswordVO.create(validPassword);
      const isMatch = await hashedPassword.compare('');

      expect(isMatch).toBe(false);
    });

    it('should be case sensitive', async () => {
      const hashedPassword = await HashedPasswordVO.create(validPassword);

      expect(await hashedPassword.compare('securepass123!')).toBe(false);
      expect(await hashedPassword.compare('SECUREPASS123!')).toBe(false);
    });
  });

  describe('fromHash', () => {
    it('should create HashedPasswordVO from existing hash', async () => {
      const original = await HashedPasswordVO.create(validPassword);
      const restored = HashedPasswordVO.fromHash(original.hash);

      expect(restored.hash).toBe(original.hash);
      expect(await restored.compare(validPassword)).toBe(true);
    });

    it('should throw for invalid hash format', () => {
      expect(() => HashedPasswordVO.fromHash('invalid')).toThrow('Invalid bcrypt hash format');
    });

    it('should throw for empty hash', () => {
      expect(() => HashedPasswordVO.fromHash('')).toThrow();
    });
  });

  describe('isValidPassword static method', () => {
    it('should return true for valid password', () => {
      expect(HashedPasswordVO.isValidPassword(validPassword)).toBe(true);
    });

    it('should return false for weak passwords', () => {
      expect(HashedPasswordVO.isValidPassword(weakPasswords.tooShort)).toBe(false);
      expect(HashedPasswordVO.isValidPassword(weakPasswords.noUppercase)).toBe(false);
      expect(HashedPasswordVO.isValidPassword(weakPasswords.noNumber)).toBe(false);
      expect(HashedPasswordVO.isValidPassword(weakPasswords.noSpecial)).toBe(false);
    });
  });

  describe('getRequirements', () => {
    it('should return array of requirements', () => {
      const requirements = HashedPasswordVO.getRequirements();

      expect(requirements).toContain('At least 8 characters');
      expect(requirements).toContain('At least 1 uppercase letter');
      expect(requirements).toContain('At least 1 number');
      expect(requirements.some((r: string) => r.includes('special character'))).toBe(true);
    });
  });

  describe('custom policy', () => {
    const customPolicy = {
      minLength: 12,
      requireUppercase: true,
      requireNumber: true,
      requireSpecialChar: false,
    };

    it('should enforce custom min length', async () => {
      await expect(HashedPasswordVO.create('ShortPass1', customPolicy)).rejects.toThrow(
        WeakPasswordException,
      );
    });

    it('should accept password matching custom policy', async () => {
      const hashed = await HashedPasswordVO.create('LongPassword123', customPolicy);
      expect(hashed.hash).toBeDefined();
    });
  });

  describe('exception details', () => {
    it('should have correct exception code', async () => {
      try {
        await HashedPasswordVO.create('weak');
      } catch (error) {
        expect(error).toBeInstanceOf(WeakPasswordException);
        expect((error as WeakPasswordException).code).toBe('WEAK_PASSWORD');
      }
    });
  });
});
