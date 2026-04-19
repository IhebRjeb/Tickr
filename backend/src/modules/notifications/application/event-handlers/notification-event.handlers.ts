import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';
import { NotificationType } from '../../domain/value-objects/notification-type.vo';
import { SendNotificationCommand } from '../commands/send-notification/send-notification.command';
import { SendNotificationHandler } from '../commands/send-notification/send-notification.handler';

/**
 * Application Event Handlers
 *
 * Listens to domain events from other modules and triggers
 * notifications accordingly. These are the integration points
 * between bounded contexts.
 */
@Injectable()
export class NotificationEventHandlers {
  private readonly logger = new Logger(NotificationEventHandlers.name);

  constructor(
    private readonly sendHandler: SendNotificationHandler,
  ) {}

  /**
   * When a ticket is confirmed, send confirmation email
   */
  @OnEvent('ticket.confirmed')
  async onTicketConfirmed(payload: {
    ticketId: string;
    userId: string;
    eventName: string;
    holderEmail: string;
    holderName: string;
  }): Promise<void> {
    this.logger.debug(
      `Ticket confirmed: ${payload.ticketId}, sending notification`,
    );

    const command = new SendNotificationCommand(
      payload.userId,
      NotificationType.TICKET_CONFIRMED,
      NotificationChannel.EMAIL,
      { email: payload.holderEmail },
      null,
      null,
      'ticket-confirmed',
      {
        ticketId: payload.ticketId,
        eventName: payload.eventName,
        holderName: payload.holderName,
      },
      null,
      null,
      { source: 'ticket.confirmed' },
    );

    const result = await this.sendHandler.execute(command);
    if (result.isFailure) {
      this.logger.warn(
        `Failed to send ticket confirmation: ${result.error.message}`,
      );
    }
  }

  /**
   * When a new user registers, send welcome email
   */
  @OnEvent('user.registered')
  async onUserRegistered(payload: {
    userId: string;
    email: string;
    firstName: string;
  }): Promise<void> {
    this.logger.debug(
      `User registered: ${payload.userId}, sending welcome`,
    );

    const command = new SendNotificationCommand(
      payload.userId,
      NotificationType.WELCOME,
      NotificationChannel.EMAIL,
      { email: payload.email },
      null,
      null,
      'welcome',
      { firstName: payload.firstName },
      null,
      null,
      { source: 'user.registered' },
    );

    const result = await this.sendHandler.execute(command);
    if (result.isFailure) {
      this.logger.warn(
        `Failed to send welcome email: ${result.error.message}`,
      );
    }
  }

  /**
   * When a password is reset, send security notification
   */
  @OnEvent('user.password-reset')
  async onPasswordReset(payload: {
    userId: string;
    email: string;
  }): Promise<void> {
    this.logger.debug(
      `Password reset for user: ${payload.userId}`,
    );

    const command = new SendNotificationCommand(
      payload.userId,
      NotificationType.PASSWORD_RESET,
      NotificationChannel.EMAIL,
      { email: payload.email },
      null,
      null,
      'password-reset',
      {},
      null,
      null,
      { source: 'user.password-reset' },
    );

    const result = await this.sendHandler.execute(command);
    if (result.isFailure) {
      this.logger.warn(
        `Failed to send password reset notification: ${result.error.message}`,
      );
    }
  }
}
