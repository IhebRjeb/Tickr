import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ApplicationException } from '@shared/application/exceptions/application.exception';
import { DomainException } from '@shared/domain/domain-exception.base';
import { AllExceptionsFilter } from '@shared/infrastructure/common/filters/all-exceptions.filter';

// Mock request and response
const mockRequest = {
  url: '/test',
  method: 'GET',
};

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });

const mockResponse = {
  status: mockStatus,
};

const mockHttpArgumentsHost: HttpArgumentsHost = {
  getRequest: jest.fn().mockReturnValue(mockRequest),
  getResponse: jest.fn().mockReturnValue(mockResponse),
  getNext: jest.fn(),
};

const mockExecutionContext: Partial<ExecutionContext> = {
  switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
};

// Test exceptions for different application codes
class TestNotFoundException extends ApplicationException {
  constructor() {
    super('Not found', 'NOT_FOUND');
  }
}

class TestValidationException extends ApplicationException {
  constructor() {
    super('Validation error', 'VALIDATION_ERROR');
  }
}

class TestUnauthorizedException extends ApplicationException {
  constructor() {
    super('Unauthorized', 'UNAUTHORIZED');
  }
}

class TestForbiddenException extends ApplicationException {
  constructor() {
    super('Forbidden', 'FORBIDDEN');
  }
}

class TestConflictException extends ApplicationException {
  constructor() {
    super('Conflict', 'CONFLICT');
  }
}

class TestUnknownException extends ApplicationException {
  constructor() {
    super('Unknown error', 'UNKNOWN_CODE');
  }
}

class TestDomainException extends DomainException {
  constructor() {
    super('Domain error', 'DOMAIN_ERROR');
  }
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.clearAllMocks();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not found',
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Custom message', error: 'CustomError' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom message',
          code: 'CustomError',
        }),
      );
    });
  });

  describe('ApplicationException handling', () => {
    it('should map NOT_FOUND code to 404 status', () => {
      const exception = new TestNotFoundException();

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should map VALIDATION_ERROR code to 400 status', () => {
      const exception = new TestValidationException();

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('should map UNAUTHORIZED code to 401 status', () => {
      const exception = new TestUnauthorizedException();

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('should map FORBIDDEN code to 403 status', () => {
      const exception = new TestForbiddenException();

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('should map CONFLICT code to 409 status', () => {
      const exception = new TestConflictException();

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('should map unknown codes to 500 status', () => {
      const exception = new TestUnknownException();

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('DomainException handling', () => {
    it('should handle DomainException with 422 status', () => {
      const exception = new TestDomainException();

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'DOMAIN_ERROR',
          message: 'Domain error',
        }),
      );
    });
  });

  describe('generic Error handling', () => {
    it('should handle generic Error with 500 status', () => {
      const exception = new Error('Generic error');

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Generic error',
        }),
      );
    });

    it('should handle non-Error exceptions', () => {
      const exception = 'string exception';

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('response format', () => {
    it('should include all required fields in response', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockExecutionContext as ExecutionContext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expect.any(Number),
          code: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String),
          path: '/test',
          method: 'GET',
        }),
      );
    });
  });
});
