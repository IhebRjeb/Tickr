import { DomainException } from '@shared/domain/domain-exception.base';

// Concrete implementation for testing
class TestDomainException extends DomainException {
  constructor(message: string) {
    super(message, 'TEST_ERROR');
  }
}

class AnotherDomainException extends DomainException {
  constructor() {
    super('Another error', 'ANOTHER_ERROR');
  }
}

describe('DomainException', () => {
  describe('constructor', () => {
    it('should create exception with message and code', () => {
      const exception = new TestDomainException('Something went wrong');

      expect(exception.message).toBe('Something went wrong');
      expect(exception.code).toBe('TEST_ERROR');
      expect(exception.name).toBe('TestDomainException');
    });

    it('should include timestamp', () => {
      const beforeCreate = new Date();
      const exception = new TestDomainException('Error');
      const afterCreate = new Date();

      expect(exception.timestamp).toBeInstanceOf(Date);
      expect(exception.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(exception.timestamp.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should have stack trace', () => {
      const exception = new TestDomainException('Error');

      expect(exception.stack).toBeDefined();
      expect(exception.stack).toContain('TestDomainException');
    });
  });

  describe('toJSON', () => {
    it('should serialize exception to JSON', () => {
      const exception = new TestDomainException('Test error message');
      const json = exception.toJSON();

      expect(json.name).toBe('TestDomainException');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Test error message');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const exception = new TestDomainException('Error');

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(DomainException);
      expect(exception).toBeInstanceOf(TestDomainException);
    });

    it('should work with different exception types', () => {
      const exception1 = new TestDomainException('Error 1');
      const exception2 = new AnotherDomainException();

      expect(exception1.code).toBe('TEST_ERROR');
      expect(exception2.code).toBe('ANOTHER_ERROR');
      expect(exception1.name).toBe('TestDomainException');
      expect(exception2.name).toBe('AnotherDomainException');
    });
  });
});
