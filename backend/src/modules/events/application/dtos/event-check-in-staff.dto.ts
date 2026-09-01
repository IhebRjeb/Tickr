import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class AssignEventCheckInStaffDto {
  @ApiProperty({
    description: 'Email address of an existing active Tickr account',
    example: 'staff@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class EventCheckInStaffAssignmentDto {
  @ApiProperty({
    description: 'Check-in staff assignment UUID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  id!: string;

  @ApiProperty({
    description: 'Event UUID this assignment applies to',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  eventId!: string;

  @ApiProperty({
    description: 'Assigned Tickr user UUID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  userId!: string;

  @ApiProperty({
    description: 'Current account email, or null if the account was removed',
    example: 'staff@example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({
    description: 'Current account first name, or null if unavailable',
    example: 'Amina',
    nullable: true,
  })
  firstName!: string | null;

  @ApiProperty({
    description: 'Current account last name, or null if unavailable',
    example: 'Ben Salah',
    nullable: true,
  })
  lastName!: string | null;

  @ApiProperty({
    description: 'Whether the linked user account is still available',
    example: true,
  })
  isAccountAvailable!: boolean;

  @ApiProperty({
    description: 'Assignment creation timestamp',
    example: '2026-09-01T17:00:00.000Z',
  })
  assignedAt!: Date;

  @ApiProperty({
    description: 'Revocation timestamp; active list entries return null',
    example: null,
    nullable: true,
  })
  revokedAt!: Date | null;
}

export class PaginatedEventCheckInStaffAssignmentsDto {
  @ApiProperty({
    description: 'Active event check-in staff assignments',
    type: [EventCheckInStaffAssignmentDto],
  })
  data!: EventCheckInStaffAssignmentDto[];

  @ApiProperty({ description: 'Total matching assignments', example: 2 })
  total!: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Maximum entries per page', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages', example: 1 })
  totalPages!: number;

  @ApiProperty({ description: 'Whether another page follows', example: false })
  hasNextPage!: boolean;

  @ApiProperty({ description: 'Whether a previous page exists', example: false })
  hasPreviousPage!: boolean;
}

export class EventCheckInAccessListItemDto {
  @ApiProperty({
    description: 'Event UUID available to the scanner operator',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  eventId!: string;

  @ApiProperty({ description: 'Event title', example: 'Tunis Jazz Night' })
  title!: string;

  @ApiProperty({ description: 'Current event status', example: 'PUBLISHED' })
  status!: string;

  @ApiProperty({
    description: 'Event start timestamp',
    example: '2026-09-10T19:00:00.000Z',
  })
  startDate!: Date;

  @ApiProperty({
    description: 'Event end timestamp',
    example: '2026-09-10T23:00:00.000Z',
  })
  endDate!: Date;

  @ApiProperty({
    description: 'Why the current account may operate this event',
    enum: ['OWNER', 'ADMIN', 'ASSIGNMENT'],
    example: 'ASSIGNMENT',
  })
  authorizationSource!: 'OWNER' | 'ADMIN' | 'ASSIGNMENT';

  @ApiProperty({
    description: 'Assignment UUID when authorizationSource is ASSIGNMENT',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440004',
    nullable: true,
  })
  assignmentId!: string | null;
}

export class PaginatedEventCheckInAccessDto {
  @ApiProperty({
    description: 'Published, non-ended events available to the scanner operator',
    type: [EventCheckInAccessListItemDto],
  })
  data!: EventCheckInAccessListItemDto[];

  @ApiProperty({ description: 'Total accessible events', example: 1 })
  total!: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Maximum entries per page', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages', example: 1 })
  totalPages!: number;

  @ApiProperty({ description: 'Whether another page follows', example: false })
  hasNextPage!: boolean;

  @ApiProperty({ description: 'Whether a previous page exists', example: false })
  hasPreviousPage!: boolean;
}