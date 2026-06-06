import { ValueObject } from '../value-object.base';

import { CURRENCY_METADATA, CurrencyVO } from './currency.vo';

interface MoneyProps {
  amount: number;
  currency: string;
}

export class InvalidMoneyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyException';
  }
}

/**
 * Money Value Object
 *
 * Handles monetary values with currency-aware precision.
 * TND uses 3 decimal places (millimes), USD/EUR use 2 (cents).
 * Precision is driven by CURRENCY_METADATA — adding a new currency
 * requires zero changes to this class.
 */
export class Money extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get formatted(): string {
    return CurrencyVO.formatAmount(this.amount, this.currency as any);
  }

  /**
   * Get the number of decimal places for this money's currency
   */
  get decimals(): number {
    const meta = CURRENCY_METADATA[this.currency as keyof typeof CURRENCY_METADATA];
    return meta ? meta.decimals : 2;
  }

  static create(amount: number, currency: string = 'TND'): Money {
    const normalized = currency.toUpperCase();
    if (!CurrencyVO.isValidCurrency(normalized)) {
      throw new InvalidMoneyException(
        `Unsupported currency: ${normalized}. Supported: ${CurrencyVO.getAllCurrencies().join(', ')}`,
      );
    }
    const rounded = CurrencyVO.roundAmountFor(amount, normalized as any);
    return new Money({
      amount: rounded,
      currency: normalized,
    });
  }

  static zero(currency: string = 'TND'): Money {
    return Money.create(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return Money.create(this.amount * factor, this.currency);
  }

  /**
   * Calculate a percentage of this money amount
   * @param rate - decimal rate (e.g., 0.04 for 4%)
   */
  percentage(rate: number): Money {
    return Money.create(this.amount * rate, this.currency);
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isNegative(): boolean {
    return this.amount < 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount >= other.amount;
  }

  isLessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount <= other.amount;
  }

  /**
   * Convert to the smallest unit for this currency.
   * TND → millimes (×1000), USD/EUR → cents (×100).
   * Used when sending amounts to payment gateways.
   */
  toSmallestUnit(): number {
    return CurrencyVO.toSmallestUnit(this.amount, this.currency as any);
  }

  /**
   * Convenience alias for Stripe API (expects cents for 2-decimal currencies).
   * For TND (3 decimals), still returns millimes (×1000).
   */
  toCents(): number {
    return this.toSmallestUnit();
  }

  /**
   * Convenience alias for Konnect API (expects millimes for TND).
   * Equivalent to toSmallestUnit() for TND.
   */
  toMillimes(): number {
    return this.toSmallestUnit();
  }

  /**
   * Create Money from smallest unit (cents/millimes) back to decimal.
   */
  static fromSmallestUnit(smallestUnit: number, currency: string = 'TND'): Money {
    const normalized = currency.toUpperCase();
    const amount = CurrencyVO.fromSmallestUnit(smallestUnit, normalized as any);
    return Money.create(amount, normalized);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new InvalidMoneyException(
        `Cannot operate on different currencies: ${this.currency} vs ${other.currency}`,
      );
    }
  }

  protected validate(props: MoneyProps): void {
    if (typeof props.amount !== 'number' || isNaN(props.amount)) {
      throw new InvalidMoneyException('Amount must be a valid number');
    }
    if (!CurrencyVO.isValidCurrency(props.currency)) {
      throw new InvalidMoneyException(
        `Unsupported currency: ${props.currency}. Supported: ${CurrencyVO.getAllCurrencies().join(', ')}`,
      );
    }
  }
}
