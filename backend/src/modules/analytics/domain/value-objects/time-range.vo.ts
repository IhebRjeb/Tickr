import { InvalidTimeRangeException } from '../exceptions/invalid-time-range.exception';

/**
 * TimeRangeVO Value Object
 *
 * Represents a validated time range with start < end and max span of 1 year.
 * Immutable after creation.
 */
export class TimeRangeVO {
  private static readonly MAX_SPAN_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

  private constructor(
    private readonly _start: Date,
    private readonly _end: Date,
  ) {}

  static create(start: Date, end: Date): TimeRangeVO {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new InvalidTimeRangeException('Start date is invalid');
    }

    if (!(end instanceof Date) || isNaN(end.getTime())) {
      throw new InvalidTimeRangeException('End date is invalid');
    }

    if (start >= end) {
      throw new InvalidTimeRangeException('Start date must be before end date');
    }

    const spanMs = end.getTime() - start.getTime();
    if (spanMs > TimeRangeVO.MAX_SPAN_MS) {
      throw new InvalidTimeRangeException('Time range cannot exceed 1 year');
    }

    return new TimeRangeVO(start, end);
  }

  get start(): Date {
    return this._start;
  }

  get end(): Date {
    return this._end;
  }

  get durationMs(): number {
    return this._end.getTime() - this._start.getTime();
  }

  get durationDays(): number {
    return Math.ceil(this.durationMs / (24 * 60 * 60 * 1000));
  }

  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  equals(other: TimeRangeVO): boolean {
    return (
      this._start.getTime() === other._start.getTime() &&
      this._end.getTime() === other._end.getTime()
    );
  }
}
