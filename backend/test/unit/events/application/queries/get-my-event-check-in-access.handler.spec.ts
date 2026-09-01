import type { EventCheckInAccessReadPort } from '@modules/events/application/ports/event-check-in-access-read.port';
import type { EventStaffUserDirectoryPort } from '@modules/events/application/ports/event-staff-user-directory.port';
import { GetMyEventCheckInAccessHandler } from '@modules/events/application/queries/get-my-event-check-in-access/get-my-event-check-in-access.handler';
import { GetMyEventCheckInAccessQuery } from '@modules/events/application/queries/get-my-event-check-in-access/get-my-event-check-in-access.query';

describe('GetMyEventCheckInAccessHandler', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  let accessRead: jest.Mocked<EventCheckInAccessReadPort>;
  let userDirectory: jest.Mocked<EventStaffUserDirectoryPort>;
  let handler: GetMyEventCheckInAccessHandler;

  beforeEach(() => {
    accessRead = {
      findAccessibleEvents: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    };
    userDirectory = {
      getUserById: jest.fn().mockResolvedValue({
        id: userId,
        email: 'staff@example.com',
        firstName: 'Door',
        lastName: 'Staff',
        role: 'PARTICIPANT',
        isActive: true,
        emailVerified: true,
      }),
    } as unknown as jest.Mocked<EventStaffUserDirectoryPort>;
    handler = new GetMyEventCheckInAccessHandler(accessRead, userDirectory);
  });

  it('lists accessible events for an eligible user', async () => {
    const result = await handler.execute(
      new GetMyEventCheckInAccessQuery(userId, 1, 20),
    );

    expect(result.isSuccess).toBe(true);
    expect(accessRead.findAccessibleEvents).toHaveBeenCalledWith(
      userId,
      false,
      1,
      20,
    );
  });

  it('uses current account role for administrator access', async () => {
    userDirectory.getUserById.mockResolvedValue({
      id: userId,
      email: 'admin@example.com',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    });

    await handler.execute(new GetMyEventCheckInAccessQuery(userId));

    expect(accessRead.findAccessibleEvents).toHaveBeenCalledWith(
      userId,
      true,
      1,
      20,
    );
  });

  it('rejects inactive accounts before querying event access', async () => {
    userDirectory.getUserById.mockResolvedValue({
      id: userId,
      email: 'staff@example.com',
      firstName: 'Door',
      lastName: 'Staff',
      role: 'PARTICIPANT',
      isActive: false,
      emailVerified: true,
    });

    const result = await handler.execute(
      new GetMyEventCheckInAccessQuery(userId),
    );

    expect(result.error.type).toBe('ACCESS_DENIED');
    expect(accessRead.findAccessibleEvents).not.toHaveBeenCalled();
  });
});