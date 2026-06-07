/**
 * @file Recipient Value Object Unit Tests
 */

import {
  RecipientVO,
  InvalidRecipientException,
} from '@modules/notifications/domain';

describe('RecipientVO', () => {
  // ============================================
  // fromEmail()
  // ============================================

  describe('fromEmail()', () => {
    it('should create with valid email', () => {
      const recipient = RecipientVO.fromEmail('user@example.com');
      expect(recipient.email).toBe('user@example.com');
      expect(recipient.phone).toBeNull();
      expect(recipient.hasEmail).toBe(true);
      expect(recipient.hasPhone).toBe(false);
    });

    it('should accept emails with subdomains', () => {
      const recipient = RecipientVO.fromEmail('user@mail.example.com');
      expect(recipient.email).toBe('user@mail.example.com');
    });

    it('should accept emails with plus addressing', () => {
      const recipient = RecipientVO.fromEmail('user+tag@example.com');
      expect(recipient.email).toBe('user+tag@example.com');
    });

    it('should throw for invalid email (no @)', () => {
      expect(() => RecipientVO.fromEmail('invalid')).toThrow(
        InvalidRecipientException,
      );
    });

    it('should throw for invalid email (no domain)', () => {
      expect(() => RecipientVO.fromEmail('user@')).toThrow(
        InvalidRecipientException,
      );
    });

    it('should throw for invalid email (spaces)', () => {
      expect(() => RecipientVO.fromEmail('us er@example.com')).toThrow(
        InvalidRecipientException,
      );
    });
  });

  // ============================================
  // fromPhone()
  // ============================================

  describe('fromPhone()', () => {
    it('should create with valid Tunisia phone', () => {
      const recipient = RecipientVO.fromPhone('+21650000000');
      expect(recipient.phone).toBe('+21650000000');
      expect(recipient.email).toBeNull();
      expect(recipient.hasPhone).toBe(true);
      expect(recipient.hasEmail).toBe(false);
    });

    it('should accept various valid Tunisia numbers', () => {
      const validNumbers = [
        '+21620123456',
        '+21650000000',
        '+21690000000',
        '+21699999999',
      ];
      for (const num of validNumbers) {
        expect(() => RecipientVO.fromPhone(num)).not.toThrow();
      }
    });

    it('should throw for non-Tunisia numbers', () => {
      expect(() => RecipientVO.fromPhone('+33612345678')).toThrow(
        InvalidRecipientException,
      );
    });

    it('should throw for missing country code', () => {
      expect(() => RecipientVO.fromPhone('50000000')).toThrow(
        InvalidRecipientException,
      );
    });

    it('should throw for too few digits', () => {
      expect(() => RecipientVO.fromPhone('+2165000000')).toThrow(
        InvalidRecipientException,
      );
    });

    it('should throw for too many digits', () => {
      expect(() => RecipientVO.fromPhone('+216500000001')).toThrow(
        InvalidRecipientException,
      );
    });
  });

  // ============================================
  // fromBoth()
  // ============================================

  describe('fromBoth()', () => {
    it('should create with both email and phone', () => {
      const recipient = RecipientVO.fromBoth(
        'user@example.com',
        '+21650000000',
      );
      expect(recipient.email).toBe('user@example.com');
      expect(recipient.phone).toBe('+21650000000');
      expect(recipient.hasEmail).toBe(true);
      expect(recipient.hasPhone).toBe(true);
    });

    it('should throw for invalid email with valid phone', () => {
      expect(() =>
        RecipientVO.fromBoth('invalid', '+21650000000'),
      ).toThrow(InvalidRecipientException);
    });

    it('should throw for valid email with invalid phone', () => {
      expect(() =>
        RecipientVO.fromBoth('user@example.com', 'invalid'),
      ).toThrow(InvalidRecipientException);
    });
  });

  // ============================================
  // reconstitute()
  // ============================================

  describe('reconstitute()', () => {
    it('should reconstitute without validation', () => {
      const recipient = RecipientVO.reconstitute(
        'user@example.com',
        '+21650000000',
      );
      expect(recipient.email).toBe('user@example.com');
      expect(recipient.phone).toBe('+21650000000');
    });

    it('should reconstitute with null email', () => {
      const recipient = RecipientVO.reconstitute(null, '+21650000000');
      expect(recipient.email).toBeNull();
      expect(recipient.phone).toBe('+21650000000');
    });

    it('should reconstitute with null phone', () => {
      const recipient = RecipientVO.reconstitute('user@example.com', null);
      expect(recipient.email).toBe('user@example.com');
      expect(recipient.phone).toBeNull();
    });
  });

  // ============================================
  // No contact method
  // ============================================

  describe('No contact method', () => {
    it('should throw when both email and phone are null', () => {
      expect(() =>
        RecipientVO.fromBoth(null as unknown as string, null as unknown as string),
      ).toThrow();
    });
  });
});
