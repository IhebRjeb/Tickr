import { UpdateProfileDto } from '@modules/users/application/dtos/update-profile.dto';
import { validate } from 'class-validator';

describe('UpdateProfileDto', () => {
  describe('firstName validation', () => {
    it('should pass with valid first name', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { firstName: 'John' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(0);
    });

    it('should pass when firstName is not provided', async () => {
      const dto = new UpdateProfileDto();
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(0);
    });

    it('should fail when firstName is too short', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { firstName: 'J' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(1);
    });

    it('should fail when firstName is too long', async () => {
      const dto = Object.assign(new UpdateProfileDto(), {
        firstName: 'A'.repeat(51),
      });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(1);
    });

    it('should fail when firstName contains numbers', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { firstName: 'John123' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(1);
    });

    it('should accept accented characters', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { firstName: 'José' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(0);
    });

    it('should accept hyphenated names', async () => {
      const dto = Object.assign(new UpdateProfileDto(), {
        firstName: 'Mary-Jane',
      });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(0);
    });

    it('should accept apostrophes', async () => {
      const dto = Object.assign(new UpdateProfileDto(), {
        firstName: "O'Connor",
      });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(0);
    });
  });

  describe('lastName validation', () => {
    it('should pass with valid last name', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { lastName: 'Doe' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'lastName')).toHaveLength(0);
    });

    it('should pass when lastName is not provided', async () => {
      const dto = new UpdateProfileDto();
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'lastName')).toHaveLength(0);
    });

    it('should fail when lastName is too short', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { lastName: 'D' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'lastName')).toHaveLength(1);
    });
  });

  describe('phone validation', () => {
    it('should pass with valid Tunisia phone', async () => {
      const dto = Object.assign(new UpdateProfileDto(), {
        phone: '+21622345678',
      });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'phone')).toHaveLength(0);
    });

    it('should pass when phone is empty string (clearing)', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { phone: '' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'phone')).toHaveLength(0);
    });

    it('should pass when phone is not provided', async () => {
      const dto = new UpdateProfileDto();
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'phone')).toHaveLength(0);
    });

    it('should fail with invalid phone format', async () => {
      const dto = Object.assign(new UpdateProfileDto(), { phone: '12345' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'phone')).toHaveLength(1);
    });

    it('should fail with non-Tunisia country code', async () => {
      const dto = Object.assign(new UpdateProfileDto(), {
        phone: '+33123456789',
      });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'phone')).toHaveLength(1);
    });
  });
});
