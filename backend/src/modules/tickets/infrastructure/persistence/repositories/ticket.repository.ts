import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { TicketRepositoryPort } from '../../../application/ports/ticket.repository.port';
import { TicketEntity } from '../../../domain/entities/ticket.entity';
import { TicketStatus } from '../../../domain/value-objects/ticket-status.vo';
import { TicketOrmEntity } from '../entities/ticket.orm-entity';
import { TicketMapper } from '../mappers/ticket.mapper';

/**
 * Ticket TypeORM Repository
 *
 * Implements the TicketRepositoryPort using TypeORM.
 * Provides all persistence operations for the Ticket aggregate.
 */
@Injectable()
export class TicketTypeOrmRepository implements TicketRepositoryPort {
  private readonly logger = new Logger(TicketTypeOrmRepository.name);

  constructor(
    @InjectRepository(TicketOrmEntity)
    private readonly repository: Repository<TicketOrmEntity>,
    private readonly mapper: TicketMapper,
  ) {}

  // ============================================
  // Base CRUD Operations
  // ============================================

  async findById(id: string): Promise<TicketEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return this.mapper.toDomain(entity);
  }

  async save(domain: TicketEntity): Promise<TicketEntity> {
    const existingEntity = await this.repository.findOne({
      where: { id: domain.id },
    });

    let entityToSave: TicketOrmEntity;

    if (existingEntity) {
      entityToSave = this.mapper.updatePersistence(existingEntity, domain);
    } else {
      entityToSave = this.mapper.toPersistence(domain);
    }

    const saved = await this.repository.save(entityToSave);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  // ============================================
  // Batch Operations
  // ============================================

  async saveAll(tickets: TicketEntity[]): Promise<TicketEntity[]> {
    const ormEntities = tickets.map((ticket) =>
      this.mapper.toPersistence(ticket),
    );
    const saved = await this.repository.save(ormEntities);
    return this.mapper.toDomainArray(saved);
  }

  // ============================================
  // Query Methods
  // ============================================

  async findByQRCode(qrCode: string): Promise<TicketEntity | null> {
    const entity = await this.repository.findOne({
      where: { qrCode },
    });

    if (!entity) {
      return null;
    }

    return this.mapper.toDomain(entity);
  }

  async findByOrderId(orderId: string): Promise<TicketEntity[]> {
    const entities = await this.repository.find({
      where: { orderId },
    });

    return this.mapper.toDomainArray(entities);
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TicketEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async findByEventId(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TicketEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      where: { eventId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async findExpiredReservations(): Promise<TicketEntity[]> {
    const now = new Date();

    const entities = await this.repository.find({
      where: {
        status: TicketStatus.RESERVED,
        reservedUntil: LessThan(now),
      },
    });

    return this.mapper.toDomainArray(entities);
  }

  // ============================================
  // Count Methods
  // ============================================

  async countByEventId(eventId: string): Promise<number> {
    return this.repository.count({ where: { eventId } });
  }

  async countCheckedInByEventId(eventId: string): Promise<number> {
    return this.repository.count({
      where: {
        eventId,
        status: TicketStatus.CHECKED_IN,
      },
    });
  }

  async getCheckInStats(eventId: string): Promise<{
    totalEligible: number;
    checkedIn: number;
    byTicketType: Array<{
      ticketTypeId: string;
      totalEligible: number;
      checkedIn: number;
    }>;
  }> {
    const rows = await this.repository
      .createQueryBuilder('ticket')
      .select('ticket.ticketTypeId', 'ticketTypeId')
      .addSelect('COUNT(*)', 'totalEligible')
      .addSelect(
        `COUNT(*) FILTER (WHERE ticket.status = :checkedInStatus)`,
        'checkedIn',
      )
      .where('ticket.eventId = :eventId', { eventId })
      .andWhere('ticket.status IN (:...eligibleStatuses)')
      .groupBy('ticket.ticketTypeId')
      .setParameters({
        eligibleStatuses: [TicketStatus.CONFIRMED, TicketStatus.CHECKED_IN],
        checkedInStatus: TicketStatus.CHECKED_IN,
      })
      .getRawMany<{
        ticketTypeId: string;
        totalEligible: string;
        checkedIn: string;
      }>();

    const byTicketType = rows.map((row) => ({
      ticketTypeId: row.ticketTypeId,
      totalEligible: Number(row.totalEligible),
      checkedIn: Number(row.checkedIn),
    }));

    return {
      totalEligible: byTicketType.reduce(
        (total, item) => total + item.totalEligible,
        0,
      ),
      checkedIn: byTicketType.reduce(
        (total, item) => total + item.checkedIn,
        0,
      ),
      byTicketType,
    };
  }
}
