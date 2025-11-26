import { Phone, InvalidPhoneException } from '@shared/domain/value-objects/phone.vo';

describe('Phone Value Object', () => {
  describe('create', () => {
    it('should create valid Tunisia phone number', () => {
      const phone = Phone.create('+21612345678');

      expect(phone.value).toBe('+21612345678');
      expect(phone.countryCode).toBe('+216');
      expect(phone.nationalNumber).toBe('12345678');
    });

    it('should remove whitespace', () => {
      const phone = Phone.create('+216 12 345 678');

      expect(phone.value).toBe('+21612345678');
    });

    it('should format phone number nicely', () => {
      const phone = Phone.create('+21612345678');

      expect(phone.formatted).toBe('+216 12 345 678');
    });

    it('should throw on invalid format', () => {
      expect(() => Phone.create('12345678')).toThrow(InvalidPhoneException);
      expect(() => Phone.create('+2161234567')).toThrow(InvalidPhoneException); // Too short
      expect(() => Phone.create('+216123456789')).toThrow(InvalidPhoneException); // Too long
      expect(() => Phone.create('+33612345678')).toThrow(InvalidPhoneException); // Wrong country
    });

    it('should throw on empty phone', () => {
      expect(() => Phone.create('')).toThrow(InvalidPhoneException);
    });
  });

  describe('equals', () => {
    it('should return true for same phone', () => {
      const phone1 = Phone.create('+21612345678');
      const phone2 = Phone.create('+21612345678');

      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should return false for different phones', () => {
      const phone1 = Phone.create('+21612345678');
      const phone2 = Phone.create('+21698765432');

      expect(phone1.equals(phone2)).toBe(false);
    });
  });
});
