import { InvalidPhoneFormatException } from '@modules/users/domain/exceptions/invalid-phone.exception';
import { PhoneVO } from '@modules/users/domain/value-objects/phone.vo';

describe('PhoneVO Value Object', () => {
  describe('create', () => {
    it('should create a valid Tunisia phone number', () => {
      const phone = PhoneVO.create('+21622345678');
      expect(phone.value).toBe('+21622345678');
    });

    it('should normalize phone number without spaces', () => {
      const phone = PhoneVO.create('+216 22 345 678');
      expect(phone.value).toBe('+21622345678');
    });

    it('should normalize phone number without dashes', () => {
      const phone = PhoneVO.create('+216-22-345-678');
      expect(phone.value).toBe('+21622345678');
    });

    it('should add country code to local format', () => {
      const phone = PhoneVO.create('22345678');
      expect(phone.value).toBe('+21622345678');
    });

    it('should add + prefix if missing', () => {
      const phone = PhoneVO.create('21622345678');
      expect(phone.value).toBe('+21622345678');
    });

    it('should accept all valid first digits (2-9)', () => {
      const validFirstDigits = ['2', '3', '4', '5', '6', '7', '8', '9'];

      validFirstDigits.forEach((digit) => {
        const phone = PhoneVO.create(`+216${digit}1234567`);
        expect(phone.value).toBe(`+216${digit}1234567`);
      });
    });
  });

  describe('validation errors', () => {
    it('should throw InvalidPhoneFormatException for empty phone', () => {
      expect(() => PhoneVO.create('')).toThrow(InvalidPhoneFormatException);
    });

    it('should throw InvalidPhoneFormatException for phone starting with 0', () => {
      expect(() => PhoneVO.create('+21600000000')).toThrow(InvalidPhoneFormatException);
    });

    it('should throw InvalidPhoneFormatException for phone starting with 1', () => {
      expect(() => PhoneVO.create('+21610000000')).toThrow(InvalidPhoneFormatException);
    });

    it('should throw InvalidPhoneFormatException for wrong length', () => {
      expect(() => PhoneVO.create('+2161234567')).toThrow(InvalidPhoneFormatException);
      expect(() => PhoneVO.create('+216123456789')).toThrow(InvalidPhoneFormatException);
    });

    it('should throw InvalidPhoneFormatException for wrong country code', () => {
      expect(() => PhoneVO.create('+33612345678')).toThrow(InvalidPhoneFormatException);
    });

    it('should throw InvalidPhoneFormatException for non-numeric characters', () => {
      expect(() => PhoneVO.create('+216ABCDEFGH')).toThrow(InvalidPhoneFormatException);
    });
  });

  describe('createOptional', () => {
    it('should return null for empty string', () => {
      const phone = PhoneVO.createOptional('');
      expect(phone).toBeNull();
    });

    it('should return null for whitespace only', () => {
      const phone = PhoneVO.createOptional('   ');
      expect(phone).toBeNull();
    });

    it('should return null for undefined', () => {
      const phone = PhoneVO.createOptional(undefined);
      expect(phone).toBeNull();
    });

    it('should return null for null', () => {
      const phone = PhoneVO.createOptional(null);
      expect(phone).toBeNull();
    });

    it('should return PhoneVO for valid number', () => {
      const phone = PhoneVO.createOptional('+21622345678');
      expect(phone).not.toBeNull();
      expect(phone?.value).toBe('+21622345678');
    });

    it('should throw for invalid non-empty number', () => {
      expect(() => PhoneVO.createOptional('invalid')).toThrow(InvalidPhoneFormatException);
    });
  });

  describe('isValid static method', () => {
    it('should return true for valid phone numbers', () => {
      expect(PhoneVO.isValid('+21622345678')).toBe(true);
      expect(PhoneVO.isValid('22345678')).toBe(true);
      expect(PhoneVO.isValid('21622345678')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(PhoneVO.isValid('')).toBe(false);
      expect(PhoneVO.isValid('invalid')).toBe(false);
      expect(PhoneVO.isValid('+21600000000')).toBe(false);
    });
  });

  describe('getters', () => {
    const phone = PhoneVO.create('+21622345678');

    it('should return correct country code', () => {
      expect(phone.countryCode).toBe('+216');
    });

    it('should return correct national number', () => {
      expect(phone.nationalNumber).toBe('22345678');
    });

    it('should return formatted number', () => {
      expect(phone.formatted).toBe('+216 22 345 678');
    });
  });

  describe('equals', () => {
    it('should return true for equal phones', () => {
      const phone1 = PhoneVO.create('+21622345678');
      const phone2 = PhoneVO.create('+21622345678');
      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should return true for phones with different input formats', () => {
      const phone1 = PhoneVO.create('+21622345678');
      const phone2 = PhoneVO.create('22345678');
      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should return false for different phones', () => {
      const phone1 = PhoneVO.create('+21622345678');
      const phone2 = PhoneVO.create('+21687654321');
      expect(phone1.equals(phone2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the phone value', () => {
      const phone = PhoneVO.create('+21622345678');
      expect(phone.toString()).toBe('+21622345678');
    });
  });

  describe('exception details', () => {
    it('should have correct exception code', () => {
      try {
        PhoneVO.create('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPhoneFormatException);
        expect((error as InvalidPhoneFormatException).code).toBe('INVALID_PHONE_FORMAT');
      }
    });

    it('should include format hint in message', () => {
      try {
        PhoneVO.create('invalid');
      } catch (error) {
        expect((error as InvalidPhoneFormatException).message).toContain('+216XXXXXXXX');
      }
    });
  });
});
