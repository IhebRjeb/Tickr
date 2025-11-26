import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HTTP Exception Filter
 * 
 * Handles HTTP exceptions from NestJS
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string }).message,
      error: (exceptionResponse as { error?: string }).error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(`HTTP ${status} - ${request.method} ${request.url}`);

    response.status(status).json(errorResponse);
  }
}
