/**
 * Query interface for CQRS pattern
 *
 * Queries represent read operations (no side effects)
 */

export interface IQuery<TResult> {
  readonly timestamp: Date;
  // TResult is used for type checking
  readonly _resultType?: TResult;
}

export abstract class BaseQuery<TResult> implements IQuery<TResult> {
  public readonly timestamp: Date;
  public readonly _resultType?: TResult;

  constructor() {
    this.timestamp = new Date();
  }
}
