import { InvalidTimeRangeException } from '@modules/analytics/domain/exceptions/invalid-time-range.exception';
import { TimeRangeVO } from '@modules/analytics/domain/value-objects/time-range.vo';

describe('TimeRangeVO', () => {
  const validStart = new Date('2025-01-01');
  const validEnd = new Date('2025-06-01');

  describe('create', () => {
    it('should create a valid time range', () => {
      const range = TimeRangeVO.create(validStart, validEnd);

      expect(range.start).toEqual(validStart);
      expect(range.end).toEqual(validEnd);
    });

    it('should calculate duration in milliseconds', () => {
      const range = TimeRangeVO.create(validStart, validEnd);
      const expectedMs = validEnd.getTime() - validStart.getTime();

      expect(range.durationMs).toBe(expectedMs);
    });

    it('should calculate duration in days', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-11');
      const range = TimeRangeVO.create(start, end);

      expect(range.durationDays).toBe(10);
    });

    it('should throw if start date is invalid', () => {
      expect(() => TimeRangeVO.create(new Date('invalid'), validEnd)).toThrow(
        InvalidTimeRangeException,
      );
    });

    it('should throw if end date is invalid', () => {
      expect(() => TimeRangeVO.create(validStart, new Date('invalid'))).toThrow(
        InvalidTimeRangeException,
      );
    });

    it('should throw if start >= end', () => {
      expect(() => TimeRangeVO.create(validEnd, validStart)).toThrow(
        InvalidTimeRangeException,
      );
    });

    it('should throw if start equals end', () => {
      expect(() => TimeRangeVO.create(validStart, validStart)).toThrow(
        InvalidTimeRangeException,
      );
    });

    it('should throw if time range exceeds 1 year', () => {
      const twoYearsLater = new Date('2027-01-02');
      expect(() => TimeRangeVO.create(validStart, twoYearsLater)).toThrow(
        InvalidTimeRangeException,
      );
    });

    it('should allow exactly 1 year span', () => {
      const start = new Date('2025-01-01T00:00:00Z');
      const end = new Date('2025-12-31T23:59:59Z');
      const range = TimeRangeVO.create(start, end);

      expect(range.start).toEqual(start);
      expect(range.end).toEqual(end);
    });
  });
});
