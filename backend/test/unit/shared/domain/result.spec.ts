import { Result } from '@shared/domain/result';

describe('Result', () => {
  describe('ok', () => {
    it('should create a successful result', () => {
      const result = Result.ok(42);
      
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBe(42);
    });
  });

  describe('fail', () => {
    it('should create a failed result', () => {
      const result = Result.fail('error message');
      
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('error message');
    });
  });

  describe('map', () => {
    it('should transform success value', () => {
      const result = Result.ok(5);
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isSuccess).toBe(true);
      expect(mapped.value).toBe(10);
    });

    it('should not transform failure', () => {
      const result = Result.fail<number, string>('error');
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isFailure).toBe(true);
      expect(mapped.error).toBe('error');
    });
  });

  describe('flatMap', () => {
    it('should chain successful results', () => {
      const result = Result.ok(5);
      const chained = result.flatMap(x => Result.ok(x * 2));
      
      expect(chained.isSuccess).toBe(true);
      expect(chained.value).toBe(10);
    });

    it('should stop on first failure', () => {
      const result = Result.ok(5);
      const chained = result.flatMap(() => Result.fail('error'));
      
      expect(chained.isFailure).toBe(true);
      expect(chained.error).toBe('error');
    });
  });

  describe('getOrElse', () => {
    it('should return value on success', () => {
      const result = Result.ok(42);
      expect(result.getOrElse(0)).toBe(42);
    });

    it('should return default on failure', () => {
      const result = Result.fail<number, string>('error');
      expect(result.getOrElse(0)).toBe(0);
    });
  });

  describe('combine', () => {
    it('should combine successful results', () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
      const combined = Result.combine(results);
      
      expect(combined.isSuccess).toBe(true);
      expect(combined.value).toEqual([1, 2, 3]);
    });

    it('should fail on first error', () => {
      const results = [Result.ok(1), Result.fail('error'), Result.ok(3)];
      const combined = Result.combine(results);
      
      expect(combined.isFailure).toBe(true);
      expect(combined.error).toBe('error');
    });
  });
});
