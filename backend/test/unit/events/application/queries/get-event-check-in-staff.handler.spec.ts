import type { EventCheckInStaffAssignmentRepositoryPort } from '@modules/events/application/ports/event-check-in-staff-assignment.repository.port';
import type { EventStaffUserDirectoryPort } from '@modules/events/application/ports/event-staff-user-directory.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { GetEventCheckInStaffHandler } from '@modules/events/application/queries/get-event-check-in-staff/get-event-check-in-staff.handler';
import { GetEventCheckInStaffQuery } from '@modules/events/application/queries/get-event-check-in-staff/get-event-check-in-staff.query';
import { EventCheckInStaffAssignmentEntity } from '@modules/events/domain/entities/event-check-in-staff-assignment.entity';
import type { EventEntity } from '@modules/events/domain/entities/event.entity';

describe('GetEventCheckInStaffHandler', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const organizerId = '550e8400-e29b-41d4-a716-446655440002';
  const staffUserId = '550e8400-e29b-41d4-a716-446655440003';
  let eventRepository: jest.Mocked<EventRepositoryPort>;
  let assignmentRepository: jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
  let userDirectory: jest.Mocked<EventStaffUserDirectoryPort>;
  let handler: GetEventCheckInStaffHandler;

  beforeEach(() => {
    const assignment = EventCheckInStaffAssignmentEntity.create({
      eventId,
      userId: staffUserId,
      assignedBy: organizerId,
    }).value;
    eventRepository = {
      findById: jest.fn().mockResolvedValue({
        id: eventId,
        organizerId,
      } as EventEntity),
    } as unknown as jest.Mocked<EventRepositoryPort>;
    assignmentRepository = {
      findByEvent: jest.fn().mockResolvedValue({
        data: [assignment],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    } as unknown as jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
    userDirectory = {
      getUsersByIds: jest.fn().mockResolvedValue([
        {
          id: staffUserId,
          email: 'staff@example.com',
          firstName: 'Door',
          lastName: 'Staff',
          role: 'PARTICIPANT',
          isActive: true,
          emailVerified: true,
        },
      ]),
    } as unknown as jest.Mocked<EventStaffUserDirectoryPort>;
    handler = new GetEventCheckInStaffHandler(
      eventRepository,
      assignmentRepository,
      userDirectory,
    );
  });

  it('batch-hydrates active assignments for the event owner', async () => {
    const result = await handler.execute(
      new GetEventCheckInStaffQuery(eventId, organizerId),
    );

    expect(result.value.data[0]).toEqual(
      expect.objectContaining({
        userId: staffUserId,
        email: 'staff@example.com',
        isAccountAvailable: true,
      }),
    );
    expect(userDirectory.getUsersByIds).toHaveBeenCalledWith([staffUserId]);
  });

  it('preserves the assignment when the linked account is unavailable', async () => {
    userDirectory.getUsersByIds.mockResolvedValue([]);

    const result = await handler.execute(
      new GetEventCheckInStaffQuery(eventId, organizerId),
    );

    expect(result.value.total).toBe(1);
    expect(result.value.data).toHaveLength(1);
    expect(result.value.data[0]).toEqual(
      expect.objectContaining({
        userId: staffUserId,
        email: null,
        firstName: null,
        lastName: null,
        isAccountAvailable: false,
      }),
    );
  });

  it('rejects an unrelated organizer before listing assignments', async () => {
    const result = await handler.execute(
      new GetEventCheckInStaffQuery(eventId, staffUserId),
    );

    expect(result.error.type).toBe('ACCESS_DENIED');
    expect(assignmentRepository.findByEvent).not.toHaveBeenCalled();
  });
});