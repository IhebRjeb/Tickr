import { RevokeEventCheckInStaffCommand } from '@modules/events/application/commands/revoke-event-check-in-staff/revoke-event-check-in-staff.command';
import { RevokeEventCheckInStaffHandler } from '@modules/events/application/commands/revoke-event-check-in-staff/revoke-event-check-in-staff.handler';
import type { EventCheckInStaffAssignmentRepositoryPort } from '@modules/events/application/ports/event-check-in-staff-assignment.repository.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { EventCheckInStaffAssignmentEntity } from '@modules/events/domain/entities/event-check-in-staff-assignment.entity';
import { EventEntity } from '@modules/events/domain/entities/event.entity';

describe('RevokeEventCheckInStaffHandler', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const organizerId = '550e8400-e29b-41d4-a716-446655440002';
  const staffUserId = '550e8400-e29b-41d4-a716-446655440003';
  const assignmentId = '550e8400-e29b-41d4-a716-446655440004';
  let eventRepository: jest.Mocked<EventRepositoryPort>;
  let assignmentRepository: jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
  let handler: RevokeEventCheckInStaffHandler;

  beforeEach(() => {
    eventRepository = {
      findById: jest.fn().mockResolvedValue({
        id: eventId,
        organizerId,
      } as EventEntity),
    } as unknown as jest.Mocked<EventRepositoryPort>;
    assignmentRepository = {
      findById: jest.fn().mockResolvedValue(
        EventCheckInStaffAssignmentEntity.create({
          id: assignmentId,
          eventId,
          userId: staffUserId,
          assignedBy: organizerId,
        }).value,
      ),
      revoke: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<EventCheckInStaffAssignmentRepositoryPort>;
    handler = new RevokeEventCheckInStaffHandler(
      eventRepository,
      assignmentRepository,
    );
  });

  it('revokes an active assignment by assignment ID', async () => {
    const result = await handler.execute(
      new RevokeEventCheckInStaffCommand(
        eventId,
        assignmentId,
        organizerId,
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(assignmentRepository.revoke).toHaveBeenCalledWith(
      expect.objectContaining({ id: assignmentId, revokedBy: organizerId }),
    );
  });

  it('rejects an unrelated organizer before loading the assignment', async () => {
    const result = await handler.execute(
      new RevokeEventCheckInStaffCommand(
        eventId,
        assignmentId,
        staffUserId,
      ),
    );

    expect(result.error.type).toBe('ACCESS_DENIED');
    expect(assignmentRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects an assignment belonging to another event', async () => {
    assignmentRepository.findById.mockResolvedValue(
      EventCheckInStaffAssignmentEntity.create({
        id: assignmentId,
        eventId: '550e8400-e29b-41d4-a716-446655440099',
        userId: staffUserId,
        assignedBy: organizerId,
      }).value,
    );

    const result = await handler.execute(
      new RevokeEventCheckInStaffCommand(
        eventId,
        assignmentId,
        organizerId,
      ),
    );

    expect(result.error.type).toBe('ASSIGNMENT_NOT_FOUND');
  });

  it('reports a stale compare-and-set revocation as not found', async () => {
    assignmentRepository.revoke.mockResolvedValue(false);

    const result = await handler.execute(
      new RevokeEventCheckInStaffCommand(
        eventId,
        assignmentId,
        organizerId,
      ),
    );

    expect(result.error.type).toBe('ASSIGNMENT_NOT_FOUND');
  });
});