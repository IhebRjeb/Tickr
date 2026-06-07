/**
 * Currency Enum
 *
 * Defines the supported currencies in the system.
 * Primary currency is TND (Tunisian Dinar), with support for EUR and USD.
 * Extensible: add new currencies by adding entries to the enum and CURRENCY_METADATA.
 */
export enum Currency {
  TND = 'TND',
  EUR = 'EUR',
  USD = 'USD',
}

/**
 * Currency metadata for display and formatting
 */
export interface CurrencyMetadata {
  code: Currency;
  symbol: string;
  name: string;
  nameFr: string;
  decimals: number;
  locale: string;
}

/**
 * Currency metadata mapping
 *
 * To add a new currency:
 * 1. Add to Currency enum above
 * 2. Add entry here with correct decimals
 * 3. No other code changes needed — Money VO and formatting adapt automatically
 */
export const CURRENCY_METADATA: Record<Currency, CurrencyMetadata> = {
  [Currency.TND]: {
    code: Currency.TND,
    symbol: 'DT',
    name: 'Tunisian Dinar',
    nameFr: 'Dinar Tunisien',
    decimals: 3, // TND has 3 decimal places (millimes)
    locale: 'ar-TN',
  },
  [Currency.EUR]: {
    code: Currency.EUR,
    symbol: '€',
    name: 'Euro',
    nameFr: 'Euro',
    decimals: 2,
    locale: 'fr-FR',
  },
  [Currency.USD]: {
    code: Currency.USD,
    symbol: '$',
    name: 'US Dollar',
    nameFr: 'Dollar américain',
    decimals: 2,
    locale: 'en-US',
  },
};

/**
 * Currency Value Object
 *
 * Provides currency validation and formatting utilities.
 * Metadata-driven: all behavior derives from CURRENCY_METADATA.
 */
export class CurrencyVO {
  private constructor(private readonly currency: Currency) {}

  /**
   * Get the currency value
   */
  get value(): Currency {
    return this.currency;
  }

  /**
   * Create a CurrencyVO from string
   */
  static create(currency: string): CurrencyVO {
    const normalized = currency.toUpperCase().trim();
    if (!Object.values(Currency).includes(normalized as Currency)) {
      throw new Error(
        `Invalid currency: ${currency}. Must be one of: ${Object.values(Currency).join(', ')}`,
      );
    }
    return new CurrencyVO(normalized as Currency);
  }

  /**
   * Create from enum directly
   */
  static fromEnum(currency: Currency): CurrencyVO {
    return new CurrencyVO(currency);
  }

  /**
   * Get the default currency (TND)
   */
  static default(): CurrencyVO {
    return new CurrencyVO(Currency.TND);
  }

  /**
   * Get currency metadata
   */
  getMetadata(): CurrencyMetadata {
    return CURRENCY_METADATA[this.currency];
  }

  /**
   * Get currency symbol
   */
  getSymbol(): string {
    return CURRENCY_METADATA[this.currency].symbol;
  }

  /**
   * Get currency name
   */
  getName(locale: 'en' | 'fr' = 'en'): string {
    const metadata = CURRENCY_METADATA[this.currency];
    return locale === 'fr' ? metadata.nameFr : metadata.name;
  }

  /**
   * Get number of decimal places
   */
  getDecimals(): number {
    return CURRENCY_METADATA[this.currency].decimals;
  }

  /**
   * Format amount with this currency
   */
  format(amount: number): string {
    const metadata = CURRENCY_METADATA[this.currency];
    return new Intl.NumberFormat(metadata.locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: metadata.decimals,
      maximumFractionDigits: metadata.decimals,
    }).format(amount);
  }

  /**
   * Round amount to currency's decimal places
   */
  roundAmount(amount: number): number {
    const decimals = CURRENCY_METADATA[this.currency].decimals;
    const factor = Math.pow(10, decimals);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Check if TND
   */
  isTND(): boolean {
    return this.currency === Currency.TND;
  }

  /**
   * Check if EUR
   */
  isEUR(): boolean {
    return this.currency === Currency.EUR;
  }

  /**
   * Check if USD
   */
  isUSD(): boolean {
    return this.currency === Currency.USD;
  }

  /**
   * Compare with another currency
   */
  equals(other: CurrencyVO): boolean {
    return this.currency === other.currency;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.currency;
  }

  // Static utility methods

  /**
   * Get all supported currencies
   */
  static getAllCurrencies(): Currency[] {
    return Object.values(Currency);
  }

  /**
   * Check if a value is a valid currency
   */
  static isValidCurrency(value: string): value is Currency {
    return Object.values(Currency).includes(value.toUpperCase() as Currency);
  }

  /**
   * Get symbol for a currency enum value
   */
  static getSymbolFor(currency: Currency): string {
    return CURRENCY_METADATA[currency].symbol;
  }

  /**
   * Format amount with currency enum value
   */
  static formatAmount(amount: number, currency: Currency): string {
    const metadata = CURRENCY_METADATA[currency];
    return new Intl.NumberFormat(metadata.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: metadata.decimals,
      maximumFractionDigits: metadata.decimals,
    }).format(amount);
  }

  /**
   * Round amount to currency's decimal places
   */
  static roundAmountFor(amount: number, currency: Currency): number {
    const decimals = CURRENCY_METADATA[currency].decimals;
    const factor = Math.pow(10, decimals);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Convert amount to smallest unit for the currency
   * TND → millimes (×1000), USD/EUR → cents (×100)
   */
  static toSmallestUnit(amount: number, currency: Currency): number {
    const decimals = CURRENCY_METADATA[currency].decimals;
    const factor = Math.pow(10, decimals);
    return Math.round(amount * factor);
  }

  /**
   * Convert from smallest unit back to decimal
   * millimes → TND (÷1000), cents → USD/EUR (÷100)
   */
  static fromSmallestUnit(smallestUnit: number, currency: Currency): number {
    const decimals = CURRENCY_METADATA[currency].decimals;
    const factor = Math.pow(10, decimals);
    return smallestUnit / factor;
  }

  /**
   * Parse currency from string (case-insensitive), returns null if invalid
   */
  static fromString(value: string): CurrencyVO | null {
    try {
      return CurrencyVO.create(value);
    } catch {
      return null;
    }
  }

  /**
   * Get the default currency enum value
   */
  static getDefault(): Currency {
    return Currency.TND;
  }
}
