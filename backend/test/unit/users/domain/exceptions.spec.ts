import { DuplicateEmailException } from '@modules/users/domain/exceptions/duplicate-email.exception';
import { InvalidEmailException } from '@modules/users/domain/exceptions/invalid-email.exception';
import { InvalidPhoneFormatException } from '@modules/users/domain/exceptions/invalid-phone.exception';
import { WeakPasswordException } from '@modules/users/domain/exceptions/weak-password.exception';

describe('Domain Exceptions', () => {
  describe('InvalidEmailException', () => {
    it('should have correct code', () => {
      const exception = new InvalidEmailException('bad@');
      expect(exception.code).toBe('INVALID_EMAIL');
    });

    it('should include email in message', () => {
      const exception = new InvalidEmailException('bad@');
      expect(exception.message).toContain('bad@');
    });

    it('should extend Error', () => {
      const exception = new InvalidEmailException('bad@');
      expect(exception).toBeInstanceOf(Error);
    });

    it('should have timestamp', () => {
      const exception = new InvalidEmailException('bad@');
      expect(exception.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON', () => {
      const exception = new InvalidEmailException('bad@');
      const json = exception.toJSON();
      expect(json.code).toBe('INVALID_EMAIL');
      expect(json.name).toBe('InvalidEmailException');
    });
  });

  describe('WeakPasswordException', () => {
    it('should have correct code', () => {
      const exception = new WeakPasswordException();
      expect(exception.code).toBe('WEAK_PASSWORD');
    });

    it('should have default message', () => {
      const exception = new WeakPasswordException();
      expect(exception.message).toContain('8 characters');
      expect(exception.message).toContain('uppercase');
    });

    it('should accept custom reason', () => {
      const exception = new WeakPasswordException('custom reason');
      expect(exception.message).toContain('custom reason');
    });

    describe('static factory methods', () => {
      it('tooShort should have specific message', () => {
        const exception = WeakPasswordException.tooShort();
        expect(exception.message).toContain('8 characters');
      });

      it('missingUppercase should have specific message', () => {
        const exception = WeakPasswordException.missingUppercase();
        expect(exception.message).toContain('uppercase');
      });

      it('missingNumber should have specific message', () => {
        const exception = WeakPasswordException.missingNumber();
        expect(exception.message).toContain('number');
      });

      it('missingSpecialChar should have specific message', () => {
        const exception = WeakPasswordException.missingSpecialChar();
        expect(exception.message).toContain('special character');
      });
    });
  });

  describe('InvalidPhoneFormatException', () => {
    it('should have correct code', () => {
      const exception = new InvalidPhoneFormatException('123');
      expect(exception.code).toBe('INVALID_PHONE_FORMAT');
    });

    it('should include phone in message', () => {
      const exception = new InvalidPhoneFormatException('123');
      expect(exception.message).toContain('123');
    });

    it('should include expected format hint', () => {
      const exception = new InvalidPhoneFormatException('123');
      expect(exception.message).toContain('+216XXXXXXXX');
    });
  });

  describe('DuplicateEmailException', () => {
    it('should have correct code', () => {
      const exception = new DuplicateEmailException('test@example.com');
      expect(exception.code).toBe('DUPLICATE_EMAIL');
    });

    it('should include email in message', () => {
      const exception = new DuplicateEmailException('test@example.com');
      expect(exception.message).toContain('test@example.com');
    });

    it('should indicate account already exists', () => {
      const exception = new DuplicateEmailException('test@example.com');
      expect(exception.message).toContain('already exists');
    });
  });
});
