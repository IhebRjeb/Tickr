import { InvalidDateRangeException } from '@modules/events/domain/exceptions/invalid-date-range.exception';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';

describe('EventDateRange Value Object', () => {
  // Helper to create future dates
  const futureDate = (hoursFromNow: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date;
  };

  const pastDate = (hoursAgo: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);
    return date;
  };

  describe('create', () => {
    it('should create a valid date range with future dates', () => {
      const start = futureDate(24); // 24 hours from now
      const end = futureDate(48); // 48 hours from now

      const dateRange = EventDateRangeVO.create(start, end);

      expect(dateRange).toBeInstanceOf(EventDateRangeVO);
      expect(dateRange.startDate.getTime()).toBe(start.getTime());
      expect(dateRange.endDate.getTime()).toBe(end.getTime());
    });

    it('should throw if end date is before start date', () => {
      const start = futureDate(48);
      const end = futureDate(24);

      expect(() => EventDateRangeVO.create(start, end)).toThrow(InvalidDateRangeException);
      expect(() => EventDateRangeVO.create(start, end)).toThrow('End date must be after start date');
    });

    it('should throw if end date equals start date', () => {
      const date = futureDate(24);

      expect(() => EventDateRangeVO.create(date, date)).toThrow(InvalidDateRangeException);
    });

    it('should throw if start date is not far enough in future', () => {
      const start = futureDate(0.5); // 30 minutes from now (less than 1 hour)
      const end = futureDate(24);

      expect(() => EventDateRangeVO.create(start, end)).toThrow(InvalidDateRangeException);
      expect(() => EventDateRangeVO.create(start, end)).toThrow('at least 1 hour');
    });

    it('should throw if start date is invalid', () => {
      const invalidDate = new Date('invalid');
      const end = futureDate(24);

      expect(() => EventDateRangeVO.create(invalidDate, end)).toThrow(InvalidDateRangeException);
      expect(() => EventDateRangeVO.create(invalidDate, end)).toThrow('Start date must be a valid date');
    });

    it('should throw if end date is invalid', () => {
      const start = futureDate(24);
      const invalidDate = new Date('invalid');

      expect(() => EventDateRangeVO.create(start, invalidDate)).toThrow(InvalidDateRangeException);
      expect(() => EventDateRangeVO.create(start, invalidDate)).toThrow('End date must be a valid date');
    });

    it('should accept start date exactly 1 hour from now', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
      const start = futureDate(1);
      const end = futureDate(24);

      try {
        const dateRange = EventDateRangeVO.create(start, end);
        expect(dateRange).toBeInstanceOf(EventDateRangeVO);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('createFromExisting', () => {
    it('should create date range without future validation', () => {
      const start = pastDate(48); // 48 hours ago
      const end = pastDate(24); // 24 hours ago

      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      expect(dateRange).toBeInstanceOf(EventDateRangeVO);
      expect(dateRange.startDate.getTime()).toBe(start.getTime());
    });

    it('should still validate end > start', () => {
      const start = pastDate(24);
      const end = pastDate(48);

      expect(() => EventDateRangeVO.createFromExisting(start, end)).toThrow(InvalidDateRangeException);
    });
  });

  describe('duration calculations', () => {
    it('should calculate duration in minutes', () => {
      const start = futureDate(24);
      const end = new Date(start.getTime() + 90 * 60 * 1000); // 90 minutes later

      const dateRange = EventDateRangeVO.create(start, end);

      expect(dateRange.durationInMinutes).toBe(90);
    });

    it('should calculate duration in hours', () => {
      const start = futureDate(24);
      const end = new Date(start.getTime() + 5 * 60 * 60 * 1000); // 5 hours later

      const dateRange = EventDateRangeVO.create(start, end);

      expect(dateRange.durationInHours).toBe(5);
    });

    it('should calculate duration in days', () => {
      const start = futureDate(24);
      const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later

      const dateRange = EventDateRangeVO.create(start, end);

      expect(dateRange.durationInDays).toBe(3);
    });

    it('should round up duration calculations', () => {
      const start = futureDate(24);
      const end = new Date(start.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours

      const dateRange = EventDateRangeVO.create(start, end);

      expect(dateRange.durationInHours).toBe(3); // Rounded up
    });
  });

  describe('isMultiDay', () => {
    it('should return false for same-day event', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');

      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      expect(dateRange.isMultiDay).toBe(false);
    });

    it('should return true for multi-day event', () => {
      const start = new Date('2025-12-15T18:00:00Z');
      const end = new Date('2025-12-17T22:00:00Z');

      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      expect(dateRange.isMultiDay).toBe(true);
    });
  });

  describe('contains', () => {
    it('should return true for date within range', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      const middleDate = new Date('2025-12-15T14:00:00Z');

      expect(dateRange.contains(middleDate)).toBe(true);
    });

    it('should return true for start date', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      expect(dateRange.contains(start)).toBe(true);
    });

    it('should return true for end date', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      expect(dateRange.contains(end)).toBe(true);
    });

    it('should return false for date before range', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      const beforeDate = new Date('2025-12-15T08:00:00Z');

      expect(dateRange.contains(beforeDate)).toBe(false);
    });

    it('should return false for date after range', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      const afterDate = new Date('2025-12-15T20:00:00Z');

      expect(dateRange.contains(afterDate)).toBe(false);
    });
  });

  describe('overlaps', () => {
    it('should detect overlapping ranges', () => {
      const range1 = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T10:00:00Z'),
        new Date('2025-12-15T14:00:00Z'),
      );
      const range2 = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T12:00:00Z'),
        new Date('2025-12-15T18:00:00Z'),
      );

      expect(range1.overlaps(range2)).toBe(true);
      expect(range2.overlaps(range1)).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const range1 = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T10:00:00Z'),
        new Date('2025-12-15T12:00:00Z'),
      );
      const range2 = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T14:00:00Z'),
        new Date('2025-12-15T18:00:00Z'),
      );

      expect(range1.overlaps(range2)).toBe(false);
      expect(range2.overlaps(range1)).toBe(false);
    });

    it('should detect adjacent ranges as overlapping at boundary', () => {
      const range1 = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T10:00:00Z'),
        new Date('2025-12-15T14:00:00Z'),
      );
      const range2 = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T14:00:00Z'),
        new Date('2025-12-15T18:00:00Z'),
      );

      expect(range1.overlaps(range2)).toBe(true);
    });

    it('should detect contained range as overlapping', () => {
      const outer = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T10:00:00Z'),
        new Date('2025-12-15T18:00:00Z'),
      );
      const inner = EventDateRangeVO.createFromExisting(
        new Date('2025-12-15T12:00:00Z'),
        new Date('2025-12-15T16:00:00Z'),
      );

      expect(outer.overlaps(inner)).toBe(true);
      expect(inner.overlaps(outer)).toBe(true);
    });
  });

  describe('time status methods', () => {
    describe('isInFuture', () => {
      it('should return true for future event', () => {
        const dateRange = EventDateRangeVO.create(futureDate(24), futureDate(48));

        expect(dateRange.isInFuture()).toBe(true);
      });

      it('should return false for past event', () => {
        const dateRange = EventDateRangeVO.createFromExisting(pastDate(48), pastDate(24));

        expect(dateRange.isInFuture()).toBe(false);
      });
    });

    describe('isInPast', () => {
      it('should return true for past event', () => {
        const dateRange = EventDateRangeVO.createFromExisting(pastDate(48), pastDate(24));

        expect(dateRange.isInPast()).toBe(true);
      });

      it('should return false for future event', () => {
        const dateRange = EventDateRangeVO.create(futureDate(24), futureDate(48));

        expect(dateRange.isInPast()).toBe(false);
      });
    });

    describe('isOngoing', () => {
      it('should return true for currently ongoing event', () => {
        const dateRange = EventDateRangeVO.createFromExisting(pastDate(2), futureDate(2));

        expect(dateRange.isOngoing()).toBe(true);
      });

      it('should return false for future event', () => {
        const dateRange = EventDateRangeVO.create(futureDate(24), futureDate(48));

        expect(dateRange.isOngoing()).toBe(false);
      });

      it('should return false for past event', () => {
        const dateRange = EventDateRangeVO.createFromExisting(pastDate(48), pastDate(24));

        expect(dateRange.isOngoing()).toBe(false);
      });
    });

    describe('hasStarted', () => {
      it('should return true for started event', () => {
        const dateRange = EventDateRangeVO.createFromExisting(pastDate(2), futureDate(2));

        expect(dateRange.hasStarted()).toBe(true);
      });

      it('should return false for future event', () => {
        const dateRange = EventDateRangeVO.create(futureDate(24), futureDate(48));

        expect(dateRange.hasStarted()).toBe(false);
      });
    });
  });

  describe('time until calculations', () => {
    it('should return positive time until start for future event', () => {
      const dateRange = EventDateRangeVO.create(futureDate(24), futureDate(48));

      expect(dateRange.getTimeUntilStart()).toBeGreaterThan(0);
    });

    it('should return negative time until start for started event', () => {
      const dateRange = EventDateRangeVO.createFromExisting(pastDate(2), futureDate(2));

      expect(dateRange.getTimeUntilStart()).toBeLessThan(0);
    });

    it('should return positive time until end for ongoing event', () => {
      const dateRange = EventDateRangeVO.createFromExisting(pastDate(2), futureDate(2));

      expect(dateRange.getTimeUntilEnd()).toBeGreaterThan(0);
    });

    it('should return negative time until end for past event', () => {
      const dateRange = EventDateRangeVO.createFromExisting(pastDate(48), pastDate(24));

      expect(dateRange.getTimeUntilEnd()).toBeLessThan(0);
    });
  });

  describe('sales period validation', () => {
    it('should validate valid sales period', () => {
      const eventStart = new Date('2025-12-20T10:00:00Z');
      const eventEnd = new Date('2025-12-20T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(eventStart, eventEnd);

      const salesStart = new Date('2025-12-01T00:00:00Z');
      const salesEnd = new Date('2025-12-19T23:59:59Z');

      expect(dateRange.isValidSalesPeriod(salesStart, salesEnd)).toBe(true);
    });

    it('should reject sales period ending after event start', () => {
      const eventStart = new Date('2025-12-20T10:00:00Z');
      const eventEnd = new Date('2025-12-20T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(eventStart, eventEnd);

      const salesStart = new Date('2025-12-01T00:00:00Z');
      const salesEnd = new Date('2025-12-20T12:00:00Z'); // After event start

      expect(dateRange.isValidSalesPeriod(salesStart, salesEnd)).toBe(false);
    });

    it('should reject invalid sales period (start after end)', () => {
      const eventStart = new Date('2025-12-20T10:00:00Z');
      const eventEnd = new Date('2025-12-20T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(eventStart, eventEnd);

      const salesStart = new Date('2025-12-15T00:00:00Z');
      const salesEnd = new Date('2025-12-10T00:00:00Z'); // Before sales start

      expect(dateRange.isValidSalesPeriod(salesStart, salesEnd)).toBe(false);
    });

    it('should return max sales end date as event start', () => {
      const eventStart = new Date('2025-12-20T10:00:00Z');
      const eventEnd = new Date('2025-12-20T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(eventStart, eventEnd);

      expect(dateRange.getMaxSalesEndDate().getTime()).toBe(eventStart.getTime());
    });
  });

  describe('formatted output', () => {
    it('should format same-day event', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      const formatted = dateRange.getFormattedRange('en-US');

      expect(formatted).toContain('Dec');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should format multi-day event', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-17T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      const formatted = dateRange.getFormattedRange('en-US');

      expect(formatted).toContain('15');
      expect(formatted).toContain('17');
    });

    it('should return ISO strings', () => {
      const start = new Date('2025-12-15T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const dateRange = EventDateRangeVO.createFromExisting(start, end);

      const isoStrings = dateRange.toISOStrings();

      expect(isoStrings.startDate).toBe('2025-12-15T10:00:00.000Z');
      expect(isoStrings.endDate).toBe('2025-12-15T18:00:00.000Z');
    });
  });

  describe('immutability', () => {
    it('should return new Date instances for startDate', () => {
      const start = futureDate(24);
      const end = futureDate(48);
      const dateRange = EventDateRangeVO.create(start, end);

      const date1 = dateRange.startDate;
      const date2 = dateRange.startDate;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should return new Date instances for endDate', () => {
      const start = futureDate(24);
      const end = futureDate(48);
      const dateRange = EventDateRangeVO.create(start, end);

      const date1 = dateRange.endDate;
      const date2 = dateRange.endDate;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should not be affected by changes to original dates', () => {
      const start = futureDate(24);
      const end = futureDate(48);
      const originalStartTime = start.getTime();

      const dateRange = EventDateRangeVO.create(start, end);

      start.setFullYear(2030);

      expect(dateRange.startDate.getTime()).toBe(originalStartTime);
    });
  });
});
