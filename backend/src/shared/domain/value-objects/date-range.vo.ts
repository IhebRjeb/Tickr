import { ValueObject } from '../value-object.base';

interface DateRangeProps {
  startDate: Date;
  endDate: Date;
}

export class InvalidDateRangeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDateRangeException';
  }
}

/**
 * DateRange Value Object
 * 
 * Represents a period between two dates
 */
export class DateRange extends ValueObject<DateRangeProps> {
  get startDate(): Date {
    return new Date(this.props.startDate);
  }

  get endDate(): Date {
    return new Date(this.props.endDate);
  }

  get durationInDays(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get durationInHours(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60));
  }

  get durationInMinutes(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60));
  }

  static create(startDate: Date, endDate: Date): DateRange {
    return new DateRange({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: DateRange): boolean {
    return this.startDate <= other.endDate && this.endDate >= other.startDate;
  }

  isInFuture(): boolean {
    return this.startDate > new Date();
  }

  isInPast(): boolean {
    return this.endDate < new Date();
  }

  isOngoing(): boolean {
    const now = new Date();
    return this.startDate <= now && this.endDate >= now;
  }

  protected validate(props: DateRangeProps): void {
    if (!(props.startDate instanceof Date) || isNaN(props.startDate.getTime())) {
      throw new InvalidDateRangeException('Start date must be a valid date');
    }
    if (!(props.endDate instanceof Date) || isNaN(props.endDate.getTime())) {
      throw new InvalidDateRangeException('End date must be a valid date');
    }
    if (props.endDate <= props.startDate) {
      throw new InvalidDateRangeException('End date must be after start date');
    }
  }
}
