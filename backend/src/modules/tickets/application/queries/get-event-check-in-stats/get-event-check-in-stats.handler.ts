import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type { CheckInStatsDto } from '../../dtos/check-in-stats.dto';
import { EVENT_CHECK_IN_ACCESS_PORT } from '../../ports/event-check-in-access.port';
import type { EventCheckInAccessPort } from '../../ports/event-check-in-access.port';
import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  GetEventCheckInStatsQuery,
  type GetEventCheckInStatsErrorQuery,
  type GetEventCheckInStatsResultQuery,
} from './get-event-check-in-stats.query';

// Re-export types for external use
export type GetEventCheckInStatsResult = GetEventCheckInStatsResultQuery;
export type GetEventCheckInStatsError = GetEventCheckInStatsErrorQuery;

@Injectable()
export class GetEventCheckInStatsHandler {
  private readonly logger = new Logger(GetEventCheckInStatsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_CHECK_IN_ACCESS_PORT)
    private readonly eventCheckInAccess: EventCheckInAccessPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
  ) {}

  async execute(
    query: GetEventCheckInStatsQuery,
  ): Promise<Result<GetEventCheckInStatsResult, GetEventCheckInStatsError>> {
    this.logger.debug(
      `Getting check-in stats for event ${query.eventId}`,
    );

    const access = await this.eventCheckInAccess.resolve(
      query.eventId,
      query.actorId,
    );
    if (!access?.canViewBasicStats) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Check-in statistics access denied',
      });
    }

    const { totalEligible, checkedIn, byTicketType } =
      await this.ticketRepository.getCheckInStats(
      query.eventId,
    );
    const ticketTypes = await this.eventQuery.getTicketTypesByIds(
      byTicketType.map((item) => item.ticketTypeId),
    );
    const ticketTypeNames = new Map(
      ticketTypes.map((ticketType) => [ticketType.id, ticketType.name]),
    );

    const checkInRate =
      totalEligible > 0 ? Math.round((checkedIn / totalEligible) * 100) : 0;

    const stats: CheckInStatsDto = {
      totalTickets: totalEligible,
      checkedIn,
      remaining: totalEligible - checkedIn,
      checkInRate,
      byType: byTicketType.map((item) => ({
        ticketTypeName:
          ticketTypeNames.get(item.ticketTypeId) ?? 'Unknown ticket type',
        total: item.totalEligible,
        checkedIn: item.checkedIn,
        rate:
          item.totalEligible > 0
            ? Math.round((item.checkedIn / item.totalEligible) * 100)
            : 0,
      })),
    };

    this.logger.debug(
      `Check-in stats for event ${query.eventId}: ${checkedIn}/${totalEligible} (${checkInRate}%)`,
    );

    return Result.ok(stats);
  }
}
