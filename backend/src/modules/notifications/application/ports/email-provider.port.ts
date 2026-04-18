/**
 * Injection token for EmailProvider
 */
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

/**
 * Email send request
 */
export interface SendEmailRequest {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Email send response
 */
export interface SendEmailResponse {
  messageId: string;
  success: boolean;
}

/**
 * Email Provider Port
 *
 * Defines the contract for sending emails.
 * Implementation: AWS SES adapter in infrastructure layer.
 */
export interface EmailProviderPort {
  send(request: SendEmailRequest): Promise<SendEmailResponse>;
}
