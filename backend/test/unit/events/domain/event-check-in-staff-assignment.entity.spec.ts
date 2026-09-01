import { EventCheckInStaffAssignmentEntity } from '@modules/events/domain/entities/event-check-in-staff-assignment.entity';

describe('EventCheckInStaffAssignmentEntity', () => {
  const eventId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const userId = 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e';
  const organizerId = 'c3d4e5f6-a7b8-4c7d-8e1f-2a3b4c5d6e7f';

  it('creates an active event-scoped assignment', () => {
    const result = EventCheckInStaffAssignmentEntity.create({
      eventId,
      userId,
      assignedBy: organizerId,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.eventId).toBe(eventId);
    expect(result.value.userId).toBe(userId);
    expect(result.value.assignedBy).toBe(organizerId);
    expect(result.value.isActive).toBe(true);
    expect(result.value.revokedAt).toBeNull();
    expect(result.value.revokedBy).toBeNull();
  });

  it.each(['eventId', 'userId', 'assignedBy'] as const)(
    'rejects an invalid %s',
    (field) => {
      const result = EventCheckInStaffAssignmentEntity.create({
        eventId,
        userId,
        assignedBy: organizerId,
        [field]: 'invalid',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe(`${field} must be a valid UUID`);
    },
  );

  it('rejects an invalid supplied assignment ID', () => {
    const result = EventCheckInStaffAssignmentEntity.create({
      id: 'invalid',
      eventId,
      userId,
      assignedBy: organizerId,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe('id must be a valid UUID');
  });

  it('records who revoked an assignment and when', () => {
    const assignment = EventCheckInStaffAssignmentEntity.create({
      eventId,
      userId,
      assignedBy: organizerId,
    }).value;

    const result = assignment.revoke(organizerId);

    expect(result.isSuccess).toBe(true);
    expect(assignment.isActive).toBe(false);
    expect(assignment.revokedBy).toBe(organizerId);
    expect(assignment.revokedAt).toBeInstanceOf(Date);
  });

  it('rejects repeated revocation', () => {
    const assignment = EventCheckInStaffAssignmentEntity.create({
      eventId,
      userId,
      assignedBy: organizerId,
    }).value;
    assignment.revoke(organizerId);

    const result = assignment.revoke(organizerId);

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe(
      'Check-in staff assignment is already revoked',
    );
  });

  it('rejects an invalid revocation actor', () => {
    const assignment = EventCheckInStaffAssignmentEntity.create({
      eventId,
      userId,
      assignedBy: organizerId,
    }).value;

    const result = assignment.revoke('invalid');

    expect(result.isFailure).toBe(true);
    expect(assignment.isActive).toBe(true);
  });
});