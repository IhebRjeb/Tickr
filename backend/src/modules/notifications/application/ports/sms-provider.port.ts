import type { SendSmsRequest, SendSmsResponse } from '../models/sms-provider.model';

export type { SendSmsRequest, SendSmsResponse };

/**
 * Injection token for SmsProvider
 */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/**
 * SMS Provider Port
 *
 * Defines the contract for sending SMS messages.
 * Implementation: AWS SNS adapter in infrastructure layer.
 */
export interface SmsProviderPort {
  send(request: SendSmsRequest): Promise<SendSmsResponse>;
}
