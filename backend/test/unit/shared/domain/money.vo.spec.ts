import { Money, InvalidMoneyException } from '@shared/domain/value-objects/money.vo';

describe('Money Value Object', () => {
  describe('create', () => {
    it('should create valid money', () => {
      const money = Money.create(100.50, 'TND');
      
      expect(money.amount).toBe(100.5);
      expect(money.currency).toBe('TND');
    });

    it('should default to TND', () => {
      const money = Money.create(100);
      expect(money.currency).toBe('TND');
    });

    it('should round to 2 decimals', () => {
      const money = Money.create(100.999, 'TND');
      expect(money.amount).toBe(101);
    });

    it('should throw on invalid amount', () => {
      expect(() => Money.create(NaN, 'TND')).toThrow(InvalidMoneyException);
    });

    it('should throw on unsupported currency', () => {
      expect(() => Money.create(100, 'XYZ')).toThrow(InvalidMoneyException);
    });
  });

  describe('arithmetic', () => {
    it('should add money with same currency', () => {
      const money1 = Money.create(100, 'TND');
      const money2 = Money.create(50, 'TND');
      const result = money1.add(money2);
      
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('TND');
    });

    it('should subtract money with same currency', () => {
      const money1 = Money.create(100, 'TND');
      const money2 = Money.create(30, 'TND');
      const result = money1.subtract(money2);
      
      expect(result.amount).toBe(70);
    });

    it('should multiply money', () => {
      const money = Money.create(100, 'TND');
      const result = money.multiply(1.5);
      
      expect(result.amount).toBe(150);
    });

    it('should throw when operating on different currencies', () => {
      const money1 = Money.create(100, 'TND');
      const money2 = Money.create(50, 'EUR');
      
      expect(() => money1.add(money2)).toThrow(InvalidMoneyException);
    });
  });

  describe('comparisons', () => {
    it('should check if positive', () => {
      expect(Money.create(100, 'TND').isPositive()).toBe(true);
      expect(Money.create(-100, 'TND').isPositive()).toBe(false);
      expect(Money.create(0, 'TND').isPositive()).toBe(false);
    });

    it('should check if zero', () => {
      expect(Money.create(0, 'TND').isZero()).toBe(true);
      expect(Money.create(100, 'TND').isZero()).toBe(false);
    });

    it('should check if negative', () => {
      expect(Money.create(-100, 'TND').isNegative()).toBe(true);
      expect(Money.create(100, 'TND').isNegative()).toBe(false);
    });

    it('should compare money amounts', () => {
      const money1 = Money.create(100, 'TND');
      const money2 = Money.create(50, 'TND');
      
      expect(money1.isGreaterThan(money2)).toBe(true);
      expect(money2.isLessThan(money1)).toBe(true);
    });
  });
});
