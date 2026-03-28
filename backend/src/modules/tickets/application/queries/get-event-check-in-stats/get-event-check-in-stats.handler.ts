import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type { CheckInStatsDto } from '../../dtos/check-in-stats.dto';
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
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
  ) {}

  async execute(
    query: GetEventCheckInStatsQuery,
  ): Promise<Result<GetEventCheckInStatsResult, GetEventCheckInStatsError>> {
    this.logger.debug(
      `Getting check-in stats for event ${query.eventId}`,
    );

    // Validate event exists
    const event = await this.eventQuery.getEventById(query.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event '${query.eventId}' not found`,
      });
    }

    const totalTickets = await this.ticketRepository.countByEventId(
      query.eventId,
    );
    const checkedIn = await this.ticketRepository.countCheckedInByEventId(
      query.eventId,
    );

    const checkInRate =
      totalTickets > 0 ? Math.round((checkedIn / totalTickets) * 100) : 0;

    const stats: CheckInStatsDto = {
      totalTickets,
      checkedIn,
      checkInRate,
      byType: [], // TODO: Populate per-type stats when ticket type query is available
    };

    this.logger.debug(
      `Check-in stats for event ${query.eventId}: ${checkedIn}/${totalTickets} (${checkInRate}%)`,
    );

    return Result.ok(stats);
  }
}
