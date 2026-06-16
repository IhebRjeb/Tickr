import { MetricType, isValidMetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';

describe('MetricType', () => {
  describe('enum values', () => {
    it('should define all expected metric types', () => {
      expect(MetricType.REVENUE).toBe('REVENUE');
      expect(MetricType.TICKET_SOLD).toBe('TICKET_SOLD');
      expect(MetricType.CHECK_IN).toBe('CHECK_IN');
      expect(MetricType.EVENT_CREATED).toBe('EVENT_CREATED');
      expect(MetricType.USER_REGISTERED).toBe('USER_REGISTERED');
      expect(MetricType.REFUND).toBe('REFUND');
    });

    it('should have exactly 6 values', () => {
      expect(Object.values(MetricType)).toHaveLength(6);
    });
  });

  describe('isValidMetricType', () => {
    it('should return true for valid types', () => {
      expect(isValidMetricType('REVENUE')).toBe(true);
      expect(isValidMetricType('TICKET_SOLD')).toBe(true);
      expect(isValidMetricType('CHECK_IN')).toBe(true);
      expect(isValidMetricType('EVENT_CREATED')).toBe(true);
      expect(isValidMetricType('USER_REGISTERED')).toBe(true);
      expect(isValidMetricType('REFUND')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isValidMetricType('INVALID')).toBe(false);
      expect(isValidMetricType('')).toBe(false);
      expect(isValidMetricType('revenue')).toBe(false);
    });
  });
});
