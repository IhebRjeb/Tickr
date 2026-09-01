import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { TicketCheckInPersistencePort } from '../../application/ports/ticket-check-in-persistence.port';
import type { CheckInEntity } from '../../domain/entities/check-in.entity';
import type { TicketEntity } from '../../domain/entities/ticket.entity';
import { TicketStatus } from '../../domain/value-objects/ticket-status.vo';
import { CheckInOrmEntity } from '../persistence/entities/check-in.orm-entity';
import { TicketOrmEntity } from '../persistence/entities/ticket.orm-entity';
import { CheckInMapper } from '../persistence/mappers/check-in.mapper';

@Injectable()
export class TicketCheckInTypeOrmRepository
  implements TicketCheckInPersistencePort
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly checkInMapper: CheckInMapper,
  ) {}

  async commitSuccessfulCheckIn(
    ticket: TicketEntity,
    checkIn: CheckInEntity,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const update = await manager
        .getRepository(TicketOrmEntity)
        .createQueryBuilder()
        .update(TicketOrmEntity)
        .set({
          status: TicketStatus.CHECKED_IN,
          checkedInAt: ticket.checkedInAt,
          checkedInBy: ticket.checkedInBy,
          updatedAt: ticket.updatedAt,
        })
        .where('id = :ticketId', { ticketId: ticket.id })
        .andWhere('event_id = :eventId', { eventId: ticket.eventId })
        .andWhere('qr_code = :qrCode', { qrCode: ticket.qrCode.value })
        .andWhere('status = :expectedStatus', {
          expectedStatus: TicketStatus.CONFIRMED,
        })
        .execute();

      if ((update.affected ?? 0) !== 1) {
        return false;
      }

      await manager
        .getRepository(CheckInOrmEntity)
        .save(this.checkInMapper.toPersistence(checkIn));
      return true;
    });
  }
}