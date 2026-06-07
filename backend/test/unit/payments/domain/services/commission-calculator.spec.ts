import { CommissionCalculator } from '@modules/payments/domain/services/commission-calculator.service';
import { Money } from '@shared/domain/value-objects/money.vo';


describe('CommissionCalculator', () => {
  describe('constructor', () => {
    it('should create with valid rate and minimum', () => {
      const calc = new CommissionCalculator(0.04, 0.5);
      expect(calc.rate).toBe(0.04);
    });

    it('should throw for negative commission rate', () => {
      expect(() => new CommissionCalculator(-0.01, 0.5)).toThrow(
        'Commission rate must be between 0 and 1',
      );
    });

    it('should throw for commission rate > 1', () => {
      expect(() => new CommissionCalculator(1.5, 0.5)).toThrow(
        'Commission rate must be between 0 and 1',
      );
    });

    it('should throw for negative minimum amount', () => {
      expect(() => new CommissionCalculator(0.04, -1)).toThrow(
        'Minimum amount must be non-negative',
      );
    });

    it('should allow rate of 0 (no commission)', () => {
      const calc = new CommissionCalculator(0, 0);
      expect(calc.rate).toBe(0);
    });

    it('should allow rate of 1 (100% commission)', () => {
      const calc = new CommissionCalculator(1, 0);
      expect(calc.rate).toBe(1);
    });
  });

  describe('calculate', () => {
    it('should calculate standard 4% commission on TND', () => {
      const calc = new CommissionCalculator(0.04, 0.5);
      const subtotal = Money.create(100, 'TND');

      const result = calc.calculate(subtotal);

      expect(result.subtotal.amount).toBe(100);
      expect(result.platformFee.amount).toBe(4);
      expect(result.total.amount).toBe(104);
      expect(result.effectiveRate).toBeCloseTo(0.04);
    });

    it('should apply minimum commission when percentage is too low', () => {
      const calc = new CommissionCalculator(0.04, 0.5);
      const subtotal = Money.create(5, 'TND'); // 4% of 5 = 0.2, less than min 0.5

      const result = calc.calculate(subtotal);

      expect(result.platformFee.amount).toBe(0.5);
      expect(result.total.amount).toBe(5.5);
      expect(result.effectiveRate).toBe(0.1); // 0.5 / 5 = 10%
    });

    it('should not apply minimum when percentage exceeds it', () => {
      const calc = new CommissionCalculator(0.04, 0.5);
      const subtotal = Money.create(200, 'TND'); // 4% of 200 = 8, > min 0.5

      const result = calc.calculate(subtotal);

      expect(result.platformFee.amount).toBe(8);
      expect(result.total.amount).toBe(208);
    });

    it('should handle zero subtotal', () => {
      const calc = new CommissionCalculator(0.04, 0);
      const subtotal = Money.create(0, 'TND');

      const result = calc.calculate(subtotal);

      expect(result.platformFee.amount).toBe(0);
      expect(result.total.amount).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });

    it('should respect EUR currency precision (2 decimals)', () => {
      const calc = new CommissionCalculator(0.04, 0.5);
      const subtotal = Money.create(99.99, 'EUR');

      const result = calc.calculate(subtotal);

      // 4% of 99.99 = 3.9996, rounded to 4.00 for EUR
      expect(result.platformFee.amount).toBe(4);
      expect(result.total.amount).toBe(103.99);
    });

    it('should respect TND currency precision (3 decimals)', () => {
      const calc = new CommissionCalculator(0.04, 0);
      const subtotal = Money.create(33.333, 'TND');

      const result = calc.calculate(subtotal);

      // 4% of 33.333 = 1.33332, rounded to 1.333 for TND
      expect(result.platformFee.amount).toBe(1.333);
    });
  });

  describe('calculateFromAmount', () => {
    it('should calculate from raw amount and currency', () => {
      const calc = new CommissionCalculator(0.04, 0.5);

      const result = calc.calculateFromAmount(100, 'TND');

      expect(result.subtotal.amount).toBe(100);
      expect(result.platformFee.amount).toBe(4);
      expect(result.total.amount).toBe(104);
    });
  });
});
