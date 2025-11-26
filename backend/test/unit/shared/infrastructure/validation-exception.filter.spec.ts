import { ArgumentsHost } from '@nestjs/common';
import { ValidationException } from '@shared/application/exceptions/validation.exception';
import { ValidationExceptionFilter } from '@shared/infrastructure/common/filters/validation-exception.filter';

describe('ValidationExceptionFilter', () => {
  let filter: ValidationExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockGetRequest: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new ValidationExceptionFilter();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    mockGetRequest = jest.fn().mockReturnValue({
      url: '/api/test',
      method: 'POST',
    });

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: mockGetResponse,
        getRequest: mockGetRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle ValidationException with single error', () => {
    const exception = ValidationException.fromField('email', 'Email is invalid', 'bad-email');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        path: '/api/test',
      }),
    );
  });

  it('should handle ValidationException with multiple errors', () => {
    const exception = new ValidationException([
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is too short' },
    ]);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' }),
        ]),
      }),
    );
  });

  it('should include timestamp in response', () => {
    const exception = ValidationException.fromField('field', 'Error');

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });

  it('should include message in response', () => {
    const exception = new ValidationException([
      { field: 'username', message: 'Username must be unique' },
    ]);

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation failed',
      }),
    );
  });
});
