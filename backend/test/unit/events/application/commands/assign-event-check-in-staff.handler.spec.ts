import { AssignEventCheckInStaffCommand } from '@modules/events/application/commands/assign-event-check-in-staff/assign-event-check-in-staff.command';
import { AssignEventCheckInStaffHandler } from '@modules/events/application/commands/assign-event-check-in-staff/assign-event-check-in-staff.handler';
import type { EventCheckInStaffAssignmentRepositoryPort } from '@modules/events/application/ports/event-check-in-staff-assignment.repository.port';
import type { EventStaffUserDirectoryPort } from '@modules/events/application/ports/event-staff-user-directory.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';

describe('AssignEventCheckInStaffHandler', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const organizerId = '550e8400-e29b-41d4-a716-446655440002';
  const staffUserId = '550e8400-e29b-41d4-a716-446655440003';
  let event: EventEntity;
  let eventRepository: jest.Mocked<EventRepositoryPort>;
  let assignmentRepository: jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
  let userDirectory: jest.Mocked<EventStaffUserDirectoryPort>;
  let handler: AssignEventCheckInStaffHandler;

  beforeEach(() => {
    const startDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    event = EventEntity.create({
      id: eventId,
      organizerId,
      title: 'Test Event',
      category: EventCategory.CONCERT,
      location: LocationVO.create({ city: 'Tunis', country: 'Tunisia' }),
      dateRange: EventDateRangeVO.create(
        startDate,
        new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      ),
    }).value;

    eventRepository = {
      findById: jest.fn().mockResolvedValue(event),
    } as unknown as jest.Mocked<EventRepositoryPort>;
    assignmentRepository = {
      findActiveByEventAndUser: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (assignment) => assignment),
    } as unknown as jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
    userDirectory = {
      getUserByEmail: jest.fn().mockResolvedValue({
        id: staffUserId,
        email: 'staff@example.com',
        firstName: 'Door',
        lastName: 'Staff',
        role: 'PARTICIPANT',
        isActive: true,
        emailVerified: true,
      }),
    } as unknown as jest.Mocked<EventStaffUserDirectoryPort>;
    handler = new AssignEventCheckInStaffHandler(
      eventRepository,
      assignmentRepository,
      userDirectory,
    );
  });

  it('assigns an eligible user to an owned event', async () => {
    const result = await handler.execute(
      new AssignEventCheckInStaffCommand(
        eventId,
        organizerId,
        'staff@example.com',
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.value.userId).toBe(staffUserId);
    expect(assignmentRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects an unrelated organizer', async () => {
    const result = await handler.execute(
      new AssignEventCheckInStaffCommand(
        eventId,
        staffUserId,
        'staff@example.com',
      ),
    );

    expect(result.error.type).toBe('ACCESS_DENIED');
    expect(userDirectory.getUserByEmail).not.toHaveBeenCalled();
  });

  it('returns one generic error for an ineligible target', async () => {
    userDirectory.getUserByEmail.mockResolvedValue(null);

    const result = await handler.execute(
      new AssignEventCheckInStaffCommand(
        eventId,
        organizerId,
        'missing@example.com',
      ),
    );

    expect(result.error).toEqual({
      type: 'TARGET_NOT_ELIGIBLE',
      message: 'User is not eligible for check-in staff assignment',
    });
  });

  it('rejects a duplicate active assignment', async () => {
    assignmentRepository.findActiveByEventAndUser.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440004',
    } as never);

    const result = await handler.execute(
      new AssignEventCheckInStaffCommand(
        eventId,
        organizerId,
        'staff@example.com',
      ),
    );

    expect(result.error.type).toBe('ALREADY_ASSIGNED');
    expect(assignmentRepository.save).not.toHaveBeenCalled();
  });

  it('rejects assignments to a closed event', async () => {
    jest.spyOn(event, 'status', 'get').mockReturnValue(EventStatus.COMPLETED);

    const result = await handler.execute(
      new AssignEventCheckInStaffCommand(
        eventId,
        organizerId,
        'staff@example.com',
      ),
    );

    expect(result.error.type).toBe('EVENT_NOT_ASSIGNABLE');
  });
});