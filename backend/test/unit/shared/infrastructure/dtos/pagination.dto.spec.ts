import { PaginationDto, PaginatedResponseDto } from '@shared/infrastructure/common/dtos/pagination.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('PaginationDto', () => {
  it('should have default values', () => {
    const dto = new PaginationDto();

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.sortOrder).toBe('ASC');
  });

  it('should accept valid values', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 2,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
    expect(dto.sortBy).toBe('createdAt');
    expect(dto.sortOrder).toBe('DESC');
  });

  it('should fail for page less than 1', async () => {
    const dto = plainToInstance(PaginationDto, { page: 0 });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should fail for limit greater than 100', async () => {
    const dto = plainToInstance(PaginationDto, { limit: 101 });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('should fail for invalid sortOrder', async () => {
    const dto = plainToInstance(PaginationDto, { sortOrder: 'INVALID' });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'sortOrder')).toBe(true);
  });

  it('should transform string page to number', () => {
    const dto = plainToInstance(PaginationDto, { page: '5' });

    expect(dto.page).toBe(5);
  });

  it('should transform string limit to number', () => {
    const dto = plainToInstance(PaginationDto, { limit: '25' });

    expect(dto.limit).toBe(25);
  });
});

describe('PaginatedResponseDto', () => {
  it('should be defined with properties', () => {
    const dto = new PaginatedResponseDto<{ id: string }>();

    dto.data = [{ id: '1' }, { id: '2' }];
    dto.total = 100;
    dto.page = 1;
    dto.limit = 10;
    dto.totalPages = 10;
    dto.hasNextPage = true;
    dto.hasPreviousPage = false;

    expect(dto.data).toHaveLength(2);
    expect(dto.total).toBe(100);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.totalPages).toBe(10);
    expect(dto.hasNextPage).toBe(true);
    expect(dto.hasPreviousPage).toBe(false);
  });
});
