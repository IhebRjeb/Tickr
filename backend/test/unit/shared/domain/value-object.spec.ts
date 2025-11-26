import { ValueObject } from '@shared/domain/value-object.base';

// Concrete implementation for testing
interface TestValueProps {
  value: string;
  count: number;
}

class TestValueObject extends ValueObject<TestValueProps> {
  get value(): string {
    return this.props.value;
  }

  get count(): number {
    return this.props.count;
  }

  static create(value: string, count: number): TestValueObject {
    return new TestValueObject({ value, count });
  }

  protected validate(props: TestValueProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Value cannot be empty');
    }
    if (props.count < 0) {
      throw new Error('Count cannot be negative');
    }
  }
}

describe('ValueObject', () => {
  describe('constructor', () => {
    it('should create value object with valid props', () => {
      const vo = TestValueObject.create('test', 5);

      expect(vo.value).toBe('test');
      expect(vo.count).toBe(5);
    });

    it('should throw on invalid props', () => {
      expect(() => TestValueObject.create('', 5)).toThrow('Value cannot be empty');
      expect(() => TestValueObject.create('test', -1)).toThrow('Count cannot be negative');
    });
  });

  describe('immutability', () => {
    it('should freeze props', () => {
      const vo = TestValueObject.create('test', 5);

      expect(Object.isFrozen(vo.getValue())).toBe(false); // getValue returns a copy
      expect(() => {
        (vo as unknown as { props: TestValueProps }).props.value = 'changed';
      }).toThrow();
    });

    it('should return copy of props with getValue', () => {
      const vo = TestValueObject.create('test', 5);
      const props1 = vo.getValue();
      const props2 = vo.getValue();

      expect(props1).not.toBe(props2);
      expect(props1).toEqual(props2);
    });
  });

  describe('equals', () => {
    it('should return true for equal value objects', () => {
      const vo1 = TestValueObject.create('test', 5);
      const vo2 = TestValueObject.create('test', 5);

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for different value objects', () => {
      const vo1 = TestValueObject.create('test1', 5);
      const vo2 = TestValueObject.create('test2', 5);

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false for different counts', () => {
      const vo1 = TestValueObject.create('test', 5);
      const vo2 = TestValueObject.create('test', 10);

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      const vo = TestValueObject.create('test', 5);

      expect(vo.equals(null as unknown as TestValueObject)).toBe(false);
      expect(vo.equals(undefined)).toBe(false);
    });

    it('should return false for non-value-object', () => {
      const vo = TestValueObject.create('test', 5);

      expect(vo.equals({ value: 'test', count: 5 } as unknown as TestValueObject)).toBe(false);
    });
  });
});
