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

  describe('okVoid', () => {
    it('should create a successful void result', () => {
      const result = Result.okVoid();
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
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

  describe('value accessor', () => {
    it('should throw when accessing value on failure', () => {
      const result = Result.fail<number>('error');
      
      expect(() => result.value).toThrow('Cannot get value from a failed result');
    });
  });

  describe('error accessor', () => {
    it('should throw when accessing error on success', () => {
      const result = Result.ok(42);
      
      expect(() => result.error).toThrow('Cannot get error from a successful result');
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

    it('should not call fn on failed result', () => {
      const result = Result.fail<number, string>('initial error');
      const chained = result.flatMap(() => Result.ok(42));
      
      expect(chained.isFailure).toBe(true);
      expect(chained.error).toBe('initial error');
    });
  });

  describe('mapError', () => {
    it('should transform error', () => {
      const result = Result.fail<number, string>('error');
      const mapped = result.mapError(e => `Transformed: ${e}`);
      
      expect(mapped.isFailure).toBe(true);
      expect(mapped.error).toBe('Transformed: error');
    });

    it('should not transform success', () => {
      const result = Result.ok<number, string>(42);
      const mapped = result.mapError(e => `Transformed: ${e}`);
      
      expect(mapped.isSuccess).toBe(true);
      expect(mapped.value).toBe(42);
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

  describe('getOrThrow', () => {
    it('should return value on success', () => {
      const result = Result.ok(42);
      expect(result.getOrThrow()).toBe(42);
    });

    it('should throw default error on failure', () => {
      const result = Result.fail<number, string>('error message');
      expect(() => result.getOrThrow()).toThrow('error message');
    });

    it('should throw custom error on failure', () => {
      const result = Result.fail<number, string>('error');
      expect(() => result.getOrThrow((e) => new Error(`Custom: ${e}`))).toThrow('Custom: error');
    });
  });

  describe('onSuccess', () => {
    it('should execute callback on success', () => {
      const callback = jest.fn();
      const result = Result.ok(42);
      
      result.onSuccess(callback);
      
      expect(callback).toHaveBeenCalledWith(42);
    });

    it('should not execute callback on failure', () => {
      const callback = jest.fn();
      const result = Result.fail<number>('error');
      
      result.onSuccess(callback);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return same result for chaining', () => {
      const result = Result.ok(42);
      const returned = result.onSuccess(() => {});
      
      expect(returned).toBe(result);
    });
  });

  describe('onFailure', () => {
    it('should execute callback on failure', () => {
      const callback = jest.fn();
      const result = Result.fail<number, string>('error');
      
      result.onFailure(callback);
      
      expect(callback).toHaveBeenCalledWith('error');
    });

    it('should not execute callback on success', () => {
      const callback = jest.fn();
      const result = Result.ok(42);
      
      result.onFailure(callback);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return same result for chaining', () => {
      const result = Result.fail('error');
      const returned = result.onFailure(() => {});
      
      expect(returned).toBe(result);
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

    it('should combine empty array', () => {
      const combined = Result.combine([]);
      
      expect(combined.isSuccess).toBe(true);
      expect(combined.value).toEqual([]);
    });
  });

  describe('fromPromise', () => {
    it('should create success from resolved promise', async () => {
      const promise = Promise.resolve(42);
      const result = await Result.fromPromise(promise, () => 'error');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should create failure from rejected promise', async () => {
      const promise = Promise.reject(new Error('async error'));
      const result = await Result.fromPromise(promise, (e) => `Mapped: ${(e as Error).message}`);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Mapped: async error');
    });
  });
});
