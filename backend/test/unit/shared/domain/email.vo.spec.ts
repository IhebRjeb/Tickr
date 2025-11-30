import { Email, InvalidEmailException } from '@shared/domain/value-objects/email.vo';

describe('Email Value Object', () => {
  describe('create', () => {
    it('should create valid email', () => {
      const email = Email.create('test@example.com');
      
      expect(email.value).toBe('test@example.com');
      expect(email.localPart).toBe('test');
      expect(email.domain).toBe('example.com');
    });

    it('should normalize email to lowercase', () => {
      const email = Email.create('TEST@EXAMPLE.COM');
      expect(email.value).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const email = Email.create('  test@example.com  ');
      expect(email.value).toBe('test@example.com');
    });

    it('should throw on invalid email format', () => {
      expect(() => Email.create('invalid-email')).toThrow(InvalidEmailException);
      expect(() => Email.create('missing-at-sign.com')).toThrow(InvalidEmailException);
      expect(() => Email.create('@no-local-part.com')).toThrow(InvalidEmailException);
      expect(() => Email.create('no-domain@')).toThrow(InvalidEmailException);
    });
  });

  describe('equals', () => {
    it('should return true for same email', () => {
      const email1 = Email.create('test@example.com');
      const email2 = Email.create('test@example.com');
      
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = Email.create('test1@example.com');
      const email2 = Email.create('test2@example.com');
      
      expect(email1.equals(email2)).toBe(false);
    });
  });
});
