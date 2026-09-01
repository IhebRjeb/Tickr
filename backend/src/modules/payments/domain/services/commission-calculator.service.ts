import { Money } from '@shared/domain/value-objects/money.vo';

// ============================================
// Commission Calculator Domain Service
// ============================================

export interface CommissionBreakdown {
  readonly subtotal: Money;
  readonly platformFee: Money;
  readonly total: Money;
  readonly effectiveRate: number;
}

/**
 * Commission Calculator - Domain Service
 *
 * Pure domain logic for calculating platform commission.
 * No framework dependencies — testable in isolation.
 *
 * Business Rules:
 * - Commission is a percentage of subtotal (default configured as 6%)
 * - Minimum commission applies (e.g. 0.5 TND)
 * - Commission is non-refundable
 * - Rounded to currency precision (TND: 3 decimals, EUR/USD: 2)
 */
export class CommissionCalculator {
  constructor(
    private readonly commissionRate: number,
    private readonly minimumAmount: number,
  ) {
    if (commissionRate < 0 || commissionRate > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }
    if (minimumAmount < 0) {
      throw new Error('Minimum amount must be non-negative');
    }
  }

  /**
   * Calculate commission breakdown for a given subtotal
   */
  calculate(subtotal: Money): CommissionBreakdown {
    const rawFee = subtotal.percentage(this.commissionRate);

    // Apply minimum commission
    const minimumFee = Money.create(this.minimumAmount, subtotal.currency);
    const platformFee = rawFee.isGreaterThanOrEqual(minimumFee)
      ? rawFee
      : minimumFee;

    const total = subtotal.add(platformFee);
    const effectiveRate = subtotal.amount > 0
      ? platformFee.amount / subtotal.amount
      : 0;

    return {
      subtotal,
      platformFee,
      total,
      effectiveRate,
    };
  }

  /**
   * Calculate commission for a raw amount and currency
   */
  calculateFromAmount(amount: number, currency: string): CommissionBreakdown {
    const subtotal = Money.create(amount, currency);
    return this.calculate(subtotal);
  }

  /**
   * Get the configured commission rate
   */
  get rate(): number {
    return this.commissionRate;
  }
}
