import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ValidationException } from '../../../application/exceptions/validation.exception';

/**
 * Validation Exception Filter
 * 
 * Handles validation errors with detailed field information
 */
@Catch(ValidationException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: ValidationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: exception.errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(`Validation error - ${request.method} ${request.url}`);

    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }
}
