/**
 * Result Type - Railway Oriented Programming
 *
 * Provides type-safe error handling without exceptions for expected business failures.
 *
 * Usage:
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return Result.fail('Division by zero');
 *   return Result.ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isSuccess) {
 *   console.log(result.value); // 5
 * } else {
 *   console.log(result.error); // Error message
 * }
 * ```
 */

export class Result<T, E = string> {
  private readonly _isSuccess: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    if (isSuccess && error !== undefined) {
      throw new Error('Success result cannot have an error');
    }
    if (!isSuccess && value !== undefined) {
      throw new Error('Failure result cannot have a value');
    }
    if (!isSuccess && error === undefined) {
      throw new Error('Failure result must have an error');
    }

    this._isSuccess = isSuccess;
    this._value = value;
    this._error = error;
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from a failed result');
    }
    return this._value as T;
  }

  get error(): E {
    if (this._isSuccess) {
      throw new Error('Cannot get error from a successful result');
    }
    return this._error as E;
  }

  /**
   * Create a successful result
   */
  static ok<T, E = string>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  /**
   * Create a successful result with no value
   */
  static okVoid<E = string>(): Result<void, E> {
    return new Result<void, E>(true, undefined);
  }

  /**
   * Create a failed result
   */
  static fail<T, E = string>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /**
   * Map the success value to a new value
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.ok(fn(this._value as T));
    }
    return Result.fail(this._error as E);
  }

  /**
   * FlatMap (bind) - chain Results
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isSuccess) {
      return fn(this._value as T);
    }
    return Result.fail(this._error as E);
  }

  /**
   * Map the error to a new error
   */
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this._isSuccess) {
      return Result.ok(this._value as T);
    }
    return Result.fail(fn(this._error as E));
  }

  /**
   * Get value or default
   */
  getOrElse(defaultValue: T): T {
    return this._isSuccess ? (this._value as T) : defaultValue;
  }

  /**
   * Get value or throw
   */
  getOrThrow(errorFactory?: (error: E) => Error): T {
    if (this._isSuccess) {
      return this._value as T;
    }
    if (errorFactory) {
      throw errorFactory(this._error as E);
    }
    throw new Error(String(this._error));
  }

  /**
   * Execute side effect on success
   */
  onSuccess(fn: (value: T) => void): Result<T, E> {
    if (this._isSuccess) {
      fn(this._value as T);
    }
    return this;
  }

  /**
   * Execute side effect on failure
   */
  onFailure(fn: (error: E) => void): Result<T, E> {
    if (!this._isSuccess) {
      fn(this._error as E);
    }
    return this;
  }

  /**
   * Combine multiple results
   */
  static combine<T, E = string>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail(result.error);
      }
      values.push(result.value);
    }
    return Result.ok(values);
  }

  /**
   * Try to execute a function and wrap result
   */
  static async fromPromise<T, E = string>(
    promise: Promise<T>,
    errorMapper: (error: unknown) => E,
  ): Promise<Result<T, E>> {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      return Result.fail(errorMapper(error));
    }
  }
}
