import { InvalidEmailException } from '@modules/users/domain/exceptions/invalid-email.exception';
import { EmailVO } from '@modules/users/domain/value-objects/email.vo';

describe('EmailVO Value Object', () => {
  describe('create', () => {
    it('should create a valid email', () => {
      const email = EmailVO.create('test@example.com');
      expect(email.value).toBe('test@example.com');
    });

    it('should normalize email to lowercase', () => {
      const email = EmailVO.create('TEST@EXAMPLE.COM');
      expect(email.value).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const email = EmailVO.create('  test@example.com  ');
      expect(email.value).toBe('test@example.com');
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'simple@example.com',
        'very.common@example.com',
        'disposable.style.email.with+symbol@example.com',
        'other.email-with-hyphen@example.com',
        'user.name+tag+sorting@example.com',
        'x@example.com',
        'example-indeed@strange-example.com',
        'admin@mailserver1.example.com',
        'example@s.example',
      ];

      validEmails.forEach((emailStr) => {
        const email = EmailVO.create(emailStr);
        expect(email.value).toBe(emailStr.toLowerCase().trim());
      });
    });
  });

  describe('validation errors', () => {
    it('should throw InvalidEmailException for empty email', () => {
      expect(() => EmailVO.create('')).toThrow(InvalidEmailException);
    });

    it('should throw InvalidEmailException for null/undefined', () => {
      expect(() => EmailVO.create(null as unknown as string)).toThrow(InvalidEmailException);
      expect(() => EmailVO.create(undefined as unknown as string)).toThrow(InvalidEmailException);
    });

    it('should throw InvalidEmailException for email without @', () => {
      expect(() => EmailVO.create('invalidemail.com')).toThrow(InvalidEmailException);
    });

    it('should throw InvalidEmailException for email without domain', () => {
      expect(() => EmailVO.create('test@')).toThrow(InvalidEmailException);
    });

    it('should throw InvalidEmailException for email without local part', () => {
      expect(() => EmailVO.create('@example.com')).toThrow(InvalidEmailException);
    });

    it('should throw InvalidEmailException for email with invalid domain', () => {
      expect(() => EmailVO.create('test@a')).toThrow(InvalidEmailException);
      expect(() => EmailVO.create('test@ab')).toThrow(InvalidEmailException);
    });

    it('should throw InvalidEmailException for email with spaces', () => {
      expect(() => EmailVO.create('test @example.com')).toThrow(InvalidEmailException);
    });
  });

  describe('getters', () => {
    it('should return correct local part', () => {
      const email = EmailVO.create('john.doe@example.com');
      expect(email.localPart).toBe('john.doe');
    });

    it('should return correct domain', () => {
      const email = EmailVO.create('john.doe@example.com');
      expect(email.domain).toBe('example.com');
    });
  });

  describe('equals', () => {
    it('should return true for equal emails', () => {
      const email1 = EmailVO.create('test@example.com');
      const email2 = EmailVO.create('test@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return true for emails that differ only in case', () => {
      const email1 = EmailVO.create('test@example.com');
      const email2 = EmailVO.create('TEST@EXAMPLE.COM');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = EmailVO.create('test@example.com');
      const email2 = EmailVO.create('other@example.com');
      expect(email1.equals(email2)).toBe(false);
    });

    it('should return false when comparing with undefined', () => {
      const email = EmailVO.create('test@example.com');
      expect(email.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the email value', () => {
      const email = EmailVO.create('test@example.com');
      expect(email.toString()).toBe('test@example.com');
    });
  });

  describe('exception details', () => {
    it('should have correct exception code', () => {
      try {
        EmailVO.create('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidEmailException);
        expect((error as InvalidEmailException).code).toBe('INVALID_EMAIL');
      }
    });

    it('should include the invalid email in message', () => {
      try {
        EmailVO.create('notanemail');
      } catch (error) {
        expect((error as InvalidEmailException).message).toContain('notanemail');
      }
    });
  });
});
