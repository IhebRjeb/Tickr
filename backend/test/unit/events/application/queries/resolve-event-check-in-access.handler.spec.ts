import type { EventCheckInStaffAssignmentRepositoryPort } from '@modules/events/application/ports/event-check-in-staff-assignment.repository.port';
import type { EventStaffUserDirectoryPort } from '@modules/events/application/ports/event-staff-user-directory.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { ResolveEventCheckInAccessHandler } from '@modules/events/application/queries/resolve-event-check-in-access/resolve-event-check-in-access.handler';
import { ResolveEventCheckInAccessQuery } from '@modules/events/application/queries/resolve-event-check-in-access/resolve-event-check-in-access.query';
import { EventCheckInStaffAssignmentEntity } from '@modules/events/domain/entities/event-check-in-staff-assignment.entity';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';

describe('ResolveEventCheckInAccessHandler', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const organizerId = '550e8400-e29b-41d4-a716-446655440002';
  const actorId = '550e8400-e29b-41d4-a716-446655440003';
  let event: EventEntity;
  let eventRepository: jest.Mocked<EventRepositoryPort>;
  let assignmentRepository: jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
  let userDirectory: jest.Mocked<EventStaffUserDirectoryPort>;
  let handler: ResolveEventCheckInAccessHandler;

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
    jest.spyOn(event, 'status', 'get').mockReturnValue(EventStatus.PUBLISHED);

    eventRepository = {
      findById: jest.fn().mockResolvedValue(event),
    } as unknown as jest.Mocked<EventRepositoryPort>;
    assignmentRepository = {
      findActiveByEventAndUser: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
    userDirectory = {
      getUserById: jest.fn().mockResolvedValue({
        id: actorId,
        email: 'actor@example.com',
        firstName: 'Event',
        lastName: 'Staff',
        role: 'PARTICIPANT',
        isActive: true,
        emailVerified: true,
      }),
    } as unknown as jest.Mocked<EventStaffUserDirectoryPort>;
    handler = new ResolveEventCheckInAccessHandler(
      eventRepository,
      assignmentRepository,
      userDirectory,
    );
  });

  it('grants event owners check-in access', async () => {
    userDirectory.getUserById.mockResolvedValue({
      id: organizerId,
      email: 'owner@example.com',
      firstName: 'Event',
      lastName: 'Owner',
      role: 'ORGANIZER',
      isActive: true,
      emailVerified: true,
    });

    const result = await handler.execute(
      new ResolveEventCheckInAccessQuery(eventId, organizerId),
    );

    expect(result.value.authorizationSource).toBe('OWNER');
    expect(result.value.canCheckIn).toBe(true);
  });

  it('grants current administrators check-in access', async () => {
    userDirectory.getUserById.mockResolvedValue({
      id: actorId,
      email: 'admin@example.com',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    });

    const result = await handler.execute(
      new ResolveEventCheckInAccessQuery(eventId, actorId),
    );

    expect(result.value.authorizationSource).toBe('ADMIN');
  });

  it('grants active assigned users event-scoped access', async () => {
    const assignment = EventCheckInStaffAssignmentEntity.create({
      eventId,
      userId: actorId,
      assignedBy: organizerId,
    }).value;
    assignmentRepository.findActiveByEventAndUser.mockResolvedValue(assignment);

    const result = await handler.execute(
      new ResolveEventCheckInAccessQuery(eventId, actorId),
    );

    expect(result.value.authorizationSource).toBe('ASSIGNMENT');
    expect(result.value.assignmentId).toBe(assignment.id);
  });

  it('rejects users without ownership, admin role, or assignment', async () => {
    const result = await handler.execute(
      new ResolveEventCheckInAccessQuery(eventId, actorId),
    );

    expect(result.error.type).toBe('ACCESS_DENIED');
  });

  it('rejects inactive accounts even when assigned', async () => {
    userDirectory.getUserById.mockResolvedValue({
      id: actorId,
      email: 'actor@example.com',
      firstName: 'Event',
      lastName: 'Staff',
      role: 'PARTICIPANT',
      isActive: false,
      emailVerified: true,
    });

    const result = await handler.execute(
      new ResolveEventCheckInAccessQuery(eventId, actorId),
    );

    expect(result.error.type).toBe('ACCESS_DENIED');
    expect(eventRepository.findById).not.toHaveBeenCalled();
  });

  it('denies scanning when an authorized event is no longer published', async () => {
    jest.spyOn(event, 'status', 'get').mockReturnValue(EventStatus.COMPLETED);
    userDirectory.getUserById.mockResolvedValue({
      id: organizerId,
      email: 'owner@example.com',
      firstName: 'Event',
      lastName: 'Owner',
      role: 'ORGANIZER',
      isActive: true,
      emailVerified: true,
    });

    const result = await handler.execute(
      new ResolveEventCheckInAccessQuery(eventId, organizerId),
    );

    expect(result.value.canCheckIn).toBe(false);
    expect(result.value.canViewBasicStats).toBe(true);
  });
});