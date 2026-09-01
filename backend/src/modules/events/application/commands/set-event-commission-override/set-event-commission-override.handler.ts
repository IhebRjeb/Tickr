import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';
import { Result } from '@shared/domain/result';

import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  SetEventCommissionOverrideCommand,
  type SetEventCommissionOverrideError,
  type SetEventCommissionOverrideResult,
} from './set-event-commission-override.command';

@Injectable()
export class SetEventCommissionOverrideHandler {
  private readonly logger = new Logger(SetEventCommissionOverrideHandler.name);
  private readonly globalCommissionRate: number;

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisherPort,
    private readonly configService: ConfigService,
  ) {
    this.globalCommissionRate =
      this.configService.get<number>('payments.commission.rate') ??
      this.configService.get<number>('PLATFORM_COMMISSION_RATE', 0.06);
  }

  async execute(
    command: SetEventCommissionOverrideCommand,
  ): Promise<
    Result<SetEventCommissionOverrideResult, SetEventCommissionOverrideError>
  > {
    const isAdmin = await this.userValidationService.hasRole(
      command.adminId,
      'ADMIN',
    );
    if (!isAdmin) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Only an administrator can configure event commission',
      });
    }

    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${command.eventId}' not found`,
      });
    }

    const updateResult = event.setCommissionRateOverride(
      command.commissionRateOverride,
      command.adminId,
    );
    if (updateResult.isFailure) {
      return Result.fail({
        type: 'INVALID_COMMISSION_RATE',
        message: updateResult.error.message,
      });
    }

    try {
      await this.eventRepository.save(event);
      await this.eventPublisher.publishFromAggregate(event);
    } catch (error) {
      this.logger.error(
        `Failed to configure commission for event ${command.eventId}: ${error}`,
      );
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to configure event commission',
      });
    }

    const commissionRateOverride = event.commissionRateOverride;
    return Result.ok({
      eventId: event.id,
      commissionRateOverride,
      effectiveCommissionRate:
        commissionRateOverride ?? this.globalCommissionRate,
      usesGlobalRate: commissionRateOverride === null,
    });
  }
}