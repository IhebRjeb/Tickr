import { TimeSeriesDataVO } from '@modules/analytics/domain/value-objects/time-series-data.vo';

describe('TimeSeriesDataVO', () => {
  const validTimestamp = new Date('2025-06-01T12:00:00Z');

  describe('create', () => {
    it('should create a valid time series data point', () => {
      const vo = TimeSeriesDataVO.create(validTimestamp, 42.5, 'daily-sales');

      expect(vo.timestamp).toEqual(validTimestamp);
      expect(vo.value).toBe(42.5);
      expect(vo.label).toBe('daily-sales');
    });

    it('should create without label', () => {
      const vo = TimeSeriesDataVO.create(validTimestamp, 10);

      expect(vo.timestamp).toEqual(validTimestamp);
      expect(vo.value).toBe(10);
      expect(vo.label).toBeUndefined();
    });

    it('should allow zero value', () => {
      const vo = TimeSeriesDataVO.create(validTimestamp, 0);
      expect(vo.value).toBe(0);
    });

    it('should allow negative value', () => {
      const vo = TimeSeriesDataVO.create(validTimestamp, -5);
      expect(vo.value).toBe(-5);
    });

    it('should throw if timestamp is invalid', () => {
      expect(() => TimeSeriesDataVO.create(new Date('invalid'), 10)).toThrow();
    });

    it('should throw if value is NaN', () => {
      expect(() => TimeSeriesDataVO.create(validTimestamp, NaN)).toThrow();
    });
  });

  describe('equality', () => {
    it('should be equal when timestamp, value, and label match', () => {
      const a = TimeSeriesDataVO.create(validTimestamp, 42, 'test');
      const b = TimeSeriesDataVO.create(validTimestamp, 42, 'test');

      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal with different values', () => {
      const a = TimeSeriesDataVO.create(validTimestamp, 42);
      const b = TimeSeriesDataVO.create(validTimestamp, 43);

      expect(a.equals(b)).toBe(false);
    });

    it('should not be equal with different timestamps', () => {
      const a = TimeSeriesDataVO.create(new Date('2025-01-01'), 42);
      const b = TimeSeriesDataVO.create(new Date('2025-01-02'), 42);

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize correctly with label', () => {
      const vo = TimeSeriesDataVO.create(validTimestamp, 42, 'test');
      const json = vo.toJSON();

      expect(json.timestamp).toBe('2025-06-01T12:00:00.000Z');
      expect(json.value).toBe(42);
      expect(json.label).toBe('test');
    });

    it('should serialize correctly without label', () => {
      const vo = TimeSeriesDataVO.create(validTimestamp, 42);
      const json = vo.toJSON();

      expect(json.timestamp).toBe('2025-06-01T12:00:00.000Z');
      expect(json.value).toBe(42);
      expect(json.label).toBeUndefined();
    });
  });
});
