/**
 * Injection token for TicketNotificationPort
 */
export const TICKET_NOTIFICATION_PORT = Symbol('TICKET_NOTIFICATION_PORT');

/**
 * Ticket Notification Port
 *
 * Defines the contract for sending ticket-related notifications.
 * Implementation will be provided by the Notifications module
 * or an infrastructure adapter (email, SMS, push).
 *
 * Design Decisions:
 * - Port defined here, adapter lives in infrastructure or Notifications module
 * - Each method corresponds to a specific ticket lifecycle event
 * - Methods are fire-and-forget (void return) — notifications should not block
 */
export interface TicketNotificationPort {
  /**
   * Send confirmation email with QR code after ticket payment
   */
  sendTicketConfirmation(params: {
    ticketId: string;
    userId: string;
    eventId: string;
    qrCode: string;
    pdfUrl?: string;
  }): Promise<void>;

  /**
   * Send cancellation notice when a ticket is cancelled
   */
  sendTicketCancellation(params: {
    ticketId: string;
    userId: string;
    eventId: string;
    reason: string;
    refundInitiated: boolean;
  }): Promise<void>;

  /**
   * Notify user that their reservation expired without payment
   */
  sendReservationExpired(params: {
    ticketId: string;
    userId: string;
    eventId: string;
  }): Promise<void>;

  /**
   * Send ticket transfer notification to the new owner
   */
  sendTicketTransferred(params: {
    ticketId: string;
    fromUserId: string;
    toUserId: string;
    eventId: string;
  }): Promise<void>;

  /**
   * Alert security staff about a duplicate check-in attempt
   */
  sendDuplicateCheckInAlert(params: {
    ticketId: string;
    eventId: string;
    staffId: string;
    originalCheckedInAt: Date;
  }): Promise<void>;
}
