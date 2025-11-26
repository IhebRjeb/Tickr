import { ValueObject } from '../value-object.base';

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
 * Handles monetary values with currency
 */
export class Money extends ValueObject<MoneyProps> {
  private static readonly SUPPORTED_CURRENCIES = ['TND', 'EUR', 'USD'];

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get formatted(): string {
    const formatter = new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: this.props.currency,
    });
    return formatter.format(this.props.amount);
  }

  static create(amount: number, currency: string = 'TND'): Money {
    return new Money({
      amount: Math.round(amount * 100) / 100, // Round to 2 decimals
      currency: currency.toUpperCase(),
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
    if (!Money.SUPPORTED_CURRENCIES.includes(props.currency)) {
      throw new InvalidMoneyException(
        `Unsupported currency: ${props.currency}. Supported: ${Money.SUPPORTED_CURRENCIES.join(', ')}`,
      );
    }
  }
}
