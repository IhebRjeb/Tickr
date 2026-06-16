import { EntityType, isValidEntityType } from '@modules/analytics/domain/value-objects/entity-type.vo';

describe('EntityType', () => {
  describe('enum values', () => {
    it('should define all expected entity types', () => {
      expect(EntityType.EVENT).toBe('EVENT');
      expect(EntityType.USER).toBe('USER');
      expect(EntityType.ORDER).toBe('ORDER');
      expect(EntityType.PLATFORM).toBe('PLATFORM');
    });

    it('should have exactly 4 values', () => {
      expect(Object.values(EntityType)).toHaveLength(4);
    });
  });

  describe('isValidEntityType', () => {
    it('should return true for valid types', () => {
      expect(isValidEntityType('EVENT')).toBe(true);
      expect(isValidEntityType('USER')).toBe(true);
      expect(isValidEntityType('ORDER')).toBe(true);
      expect(isValidEntityType('PLATFORM')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isValidEntityType('INVALID')).toBe(false);
      expect(isValidEntityType('')).toBe(false);
      expect(isValidEntityType('event')).toBe(false);
    });
  });
});
