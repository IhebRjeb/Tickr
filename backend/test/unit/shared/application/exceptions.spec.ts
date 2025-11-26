import { ApplicationException } from '@shared/application/exceptions/application.exception';
import { ConflictException } from '@shared/application/exceptions/conflict.exception';
import { ForbiddenException } from '@shared/application/exceptions/forbidden.exception';
import { NotFoundException } from '@shared/application/exceptions/not-found.exception';
import { UnauthorizedException } from '@shared/application/exceptions/unauthorized.exception';
import { ValidationException, ValidationError } from '@shared/application/exceptions/validation.exception';

describe('Application Exceptions', () => {
  describe('NotFoundException', () => {
    it('should create with entity name and id', () => {
      const exception = new NotFoundException('User', '123');

      expect(exception.message).toBe("User with id '123' not found");
      expect(exception.code).toBe('NOT_FOUND');
      expect(exception.name).toBe('NotFoundException');
    });

    it('should be instance of ApplicationException', () => {
      const exception = new NotFoundException('Event', 'evt-1');

      expect(exception).toBeInstanceOf(ApplicationException);
      expect(exception).toBeInstanceOf(Error);
    });
  });

  describe('ValidationException', () => {
    it('should create with validation errors', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be positive', value: -5 },
      ];

      const exception = new ValidationException(errors);

      expect(exception.message).toBe('Validation failed');
      expect(exception.code).toBe('VALIDATION_ERROR');
      expect(exception.errors).toEqual(errors);
    });

    it('should create from single field', () => {
      const exception = ValidationException.fromField('name', 'Name is required');

      expect(exception.errors).toHaveLength(1);
      expect(exception.errors[0].field).toBe('name');
      expect(exception.errors[0].message).toBe('Name is required');
    });

    it('should include value in fromField', () => {
      const exception = ValidationException.fromField('age', 'Must be positive', -5);

      expect(exception.errors[0].value).toBe(-5);
    });
  });

  describe('UnauthorizedException', () => {
    it('should create with default message', () => {
      const exception = new UnauthorizedException();

      expect(exception.message).toBe('Unauthorized access');
      expect(exception.code).toBe('UNAUTHORIZED');
    });

    it('should create with custom message', () => {
      const exception = new UnauthorizedException('Token expired');

      expect(exception.message).toBe('Token expired');
    });
  });

  describe('ForbiddenException', () => {
    it('should create with default message', () => {
      const exception = new ForbiddenException();

      expect(exception.message).toBe('Access forbidden');
      expect(exception.code).toBe('FORBIDDEN');
    });

    it('should create with custom message', () => {
      const exception = new ForbiddenException('Insufficient permissions');

      expect(exception.message).toBe('Insufficient permissions');
    });
  });

  describe('ConflictException', () => {
    it('should create with message', () => {
      const exception = new ConflictException('Email already exists');

      expect(exception.message).toBe('Email already exists');
      expect(exception.code).toBe('CONFLICT');
    });
  });

  describe('ApplicationException base', () => {
    // Create a concrete test class since ApplicationException is abstract
    class TestApplicationException extends ApplicationException {
      constructor(message: string) {
        super(message, 'TEST_ERROR');
      }
    }

    it('should have timestamp', () => {
      const exception = new TestApplicationException('Test');

      expect(exception.timestamp).toBeInstanceOf(Date);
    });

    it('should have stack trace', () => {
      const exception = new TestApplicationException('Test');

      expect(exception.stack).toBeDefined();
    });
  });
});
