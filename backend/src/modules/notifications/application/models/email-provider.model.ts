/**
 * Email provider request/response models
 */

export interface SendEmailRequest {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResponse {
  messageId: string;
  success: boolean;
}
