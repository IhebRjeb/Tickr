import { DateRange, InvalidDateRangeException } from '@shared/domain/value-objects/date-range.vo';

describe('DateRange Value Object', () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  describe('create', () => {
    it('should create valid date range', () => {
      const range = DateRange.create(tomorrow, nextWeek);

      expect(range.startDate).toEqual(tomorrow);
      expect(range.endDate).toEqual(nextWeek);
    });

    it('should throw if end date is before start date', () => {
      expect(() => DateRange.create(nextWeek, tomorrow)).toThrow(InvalidDateRangeException);
    });

    it('should throw if dates are equal', () => {
      expect(() => DateRange.create(tomorrow, tomorrow)).toThrow(InvalidDateRangeException);
    });

    it('should throw for invalid dates', () => {
      expect(() => DateRange.create(new Date('invalid'), tomorrow)).toThrow(
        InvalidDateRangeException,
      );
      expect(() => DateRange.create(tomorrow, new Date('invalid'))).toThrow(
        InvalidDateRangeException,
      );
    });
  });

  describe('duration calculations', () => {
    it('should calculate duration in days', () => {
      const range = DateRange.create(now, nextWeek);

      expect(range.durationInDays).toBe(7);
    });

    it('should calculate duration in hours', () => {
      const start = new Date('2024-01-01T00:00:00');
      const end = new Date('2024-01-01T12:00:00');
      const range = DateRange.create(start, end);

      expect(range.durationInHours).toBe(12);
    });

    it('should calculate duration in minutes', () => {
      const start = new Date('2024-01-01T00:00:00');
      const end = new Date('2024-01-01T01:30:00');
      const range = DateRange.create(start, end);

      expect(range.durationInMinutes).toBe(90);
    });
  });

  describe('contains', () => {
    it('should return true if date is within range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const range = DateRange.create(start, end);

      expect(range.contains(new Date('2024-01-15'))).toBe(true);
    });

    it('should return true for boundary dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const range = DateRange.create(start, end);

      expect(range.contains(start)).toBe(true);
      expect(range.contains(end)).toBe(true);
    });

    it('should return false if date is outside range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const range = DateRange.create(start, end);

      expect(range.contains(new Date('2024-02-15'))).toBe(false);
    });
  });

  describe('overlaps', () => {
    it('should detect overlapping ranges', () => {
      const range1 = DateRange.create(new Date('2024-01-01'), new Date('2024-01-15'));
      const range2 = DateRange.create(new Date('2024-01-10'), new Date('2024-01-25'));

      expect(range1.overlaps(range2)).toBe(true);
      expect(range2.overlaps(range1)).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const range1 = DateRange.create(new Date('2024-01-01'), new Date('2024-01-10'));
      const range2 = DateRange.create(new Date('2024-01-15'), new Date('2024-01-25'));

      expect(range1.overlaps(range2)).toBe(false);
    });

    it('should detect adjacent ranges as overlapping', () => {
      const range1 = DateRange.create(new Date('2024-01-01'), new Date('2024-01-10'));
      const range2 = DateRange.create(new Date('2024-01-10'), new Date('2024-01-20'));

      expect(range1.overlaps(range2)).toBe(true);
    });
  });

  describe('temporal checks', () => {
    it('should check if range is in future', () => {
      const futureRange = DateRange.create(tomorrow, nextWeek);
      const pastRange = DateRange.create(lastWeek, yesterday);

      expect(futureRange.isInFuture()).toBe(true);
      expect(pastRange.isInFuture()).toBe(false);
    });

    it('should check if range is in past', () => {
      const futureRange = DateRange.create(tomorrow, nextWeek);
      const pastRange = DateRange.create(lastWeek, yesterday);

      expect(futureRange.isInPast()).toBe(false);
      expect(pastRange.isInPast()).toBe(true);
    });

    it('should check if range is ongoing', () => {
      const ongoingRange = DateRange.create(yesterday, tomorrow);
      const pastRange = DateRange.create(lastWeek, yesterday);

      expect(ongoingRange.isOngoing()).toBe(true);
      expect(pastRange.isOngoing()).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should return new Date objects for startDate and endDate', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const range = DateRange.create(start, end);

      expect(range.startDate).not.toBe(start);
      expect(range.endDate).not.toBe(end);
      expect(range.startDate).toEqual(start);
      expect(range.endDate).toEqual(end);
    });
  });
});
