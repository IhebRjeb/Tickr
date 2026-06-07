import type { SendEmailRequest, SendEmailResponse } from '../models/email-provider.model';

export type { SendEmailRequest, SendEmailResponse };

/**
 * Injection token for EmailProvider
 */
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

/**
 * Email Provider Port
 *
 * Defines the contract for sending emails.
 * Implementation: AWS SES adapter in infrastructure layer.
 */
export interface EmailProviderPort {
  send(request: SendEmailRequest): Promise<SendEmailResponse>;
}
