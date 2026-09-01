import { TicketCheckInTypeOrmRepository } from '@modules/tickets/infrastructure/repositories/ticket-check-in.repository';
import type { DataSource, EntityManager } from 'typeorm';

describe('TicketCheckInTypeOrmRepository', () => {
  const ticket = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    eventId: '550e8400-e29b-41d4-a716-446655440002',
    status: 'CHECKED_IN',
    checkedInAt: new Date(),
    checkedInBy: '550e8400-e29b-41d4-a716-446655440003',
    qrCode: { value: 'v1-550e8400-e29b-41d4-a716-446655440001-a1b2' },
    updatedAt: new Date(),
  };
  const checkIn = { id: '550e8400-e29b-41d4-a716-446655440004' };

  const createSubject = (affected: number) => {
    const execute = jest.fn().mockResolvedValue({ affected });
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    };
    const save = jest.fn().mockResolvedValue(undefined);
    const ticketRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const checkInRepository = { save };
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce(ticketRepository)
        .mockReturnValueOnce(checkInRepository),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        async (callback: (entityManager: EntityManager) => Promise<boolean>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const mapper = {
      toPersistence: jest.fn().mockReturnValue(checkIn),
    };

    return {
      repository: new TicketCheckInTypeOrmRepository(
        dataSource,
        mapper as never,
      ),
      execute,
      save,
      queryBuilder,
    };
  };

  it('writes the valid audit when the confirmed transition wins', async () => {
    const { repository, execute, save, queryBuilder } = createSubject(1);

    const result = await repository.commitSuccessfulCheckIn(
      ticket as never,
      checkIn as never,
    );

    expect(result).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'qr_code = :qrCode',
      { qrCode: expect.any(String) },
    );
    expect(save).toHaveBeenCalledWith(checkIn);
  });

  it('does not write a valid audit when another scanner wins', async () => {
    const { repository, save } = createSubject(0);

    const result = await repository.commitSuccessfulCheckIn(
      ticket as never,
      checkIn as never,
    );

    expect(result).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});