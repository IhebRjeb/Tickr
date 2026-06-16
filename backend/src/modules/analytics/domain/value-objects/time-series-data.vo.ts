/**
 * TimeSeriesDataVO Value Object
 *
 * Immutable data point representing a value at a specific timestamp.
 * Used for charts and time-based analytics.
 */
export class TimeSeriesDataVO {
  private constructor(
    private readonly _timestamp: Date,
    private readonly _value: number,
    private readonly _label?: string,
  ) {}

  static create(timestamp: Date, value: number, label?: string): TimeSeriesDataVO {
    if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      throw new Error('TimeSeriesDataVO: timestamp must be a valid Date');
    }

    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('TimeSeriesDataVO: value must be a valid number');
    }

    return new TimeSeriesDataVO(timestamp, value, label);
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get value(): number {
    return this._value;
  }

  get label(): string | undefined {
    return this._label;
  }

  equals(other: TimeSeriesDataVO): boolean {
    return (
      this._timestamp.getTime() === other._timestamp.getTime() &&
      this._value === other._value &&
      this._label === other._label
    );
  }

  toJSON(): { timestamp: string; value: number; label?: string } {
    return {
      timestamp: this._timestamp.toISOString(),
      value: this._value,
      ...(this._label ? { label: this._label } : {}),
    };
  }
}
