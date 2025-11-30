/**
 * Base Application Exception
 * 
 * Application-level exceptions for use cases and services
 */

export abstract class ApplicationException extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}
