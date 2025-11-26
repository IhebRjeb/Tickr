import { ApiResponseDto } from '@shared/infrastructure/common/dtos/api-response.dto';
import { ErrorResponseDto } from '@shared/infrastructure/common/dtos/error-response.dto';

describe('ApiResponseDto', () => {
  it('should be defined with all properties', () => {
    const dto = new ApiResponseDto<{ id: string }>();

    dto.success = true;
    dto.data = { id: '123' };
    dto.timestamp = new Date().toISOString();

    expect(dto.success).toBe(true);
    expect(dto.data).toEqual({ id: '123' });
    expect(dto.timestamp).toBeDefined();
  });

  it('should handle different data types', () => {
    const dtoString = new ApiResponseDto<string>();
    dtoString.success = true;
    dtoString.data = 'test string';
    dtoString.timestamp = new Date().toISOString();

    expect(dtoString.data).toBe('test string');

    const dtoArray = new ApiResponseDto<number[]>();
    dtoArray.success = true;
    dtoArray.data = [1, 2, 3];
    dtoArray.timestamp = new Date().toISOString();

    expect(dtoArray.data).toEqual([1, 2, 3]);
  });
});

describe('ErrorResponseDto', () => {
  it('should be defined with required properties', () => {
    const dto = new ErrorResponseDto();

    dto.statusCode = 404;
    dto.code = 'NOT_FOUND';
    dto.message = 'Resource not found';
    dto.timestamp = new Date().toISOString();
    dto.path = '/api/resources/123';

    expect(dto.statusCode).toBe(404);
    expect(dto.code).toBe('NOT_FOUND');
    expect(dto.message).toBe('Resource not found');
    expect(dto.path).toBe('/api/resources/123');
    expect(dto.details).toBeUndefined();
  });

  it('should handle optional details', () => {
    const dto = new ErrorResponseDto();

    dto.statusCode = 400;
    dto.code = 'VALIDATION_ERROR';
    dto.message = 'Validation failed';
    dto.details = { field: 'email', reason: 'Invalid format' };
    dto.timestamp = new Date().toISOString();
    dto.path = '/api/users';

    expect(dto.details).toEqual({ field: 'email', reason: 'Invalid format' });
  });
});
