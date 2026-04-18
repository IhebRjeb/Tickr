/**
 * Injection token for SmsProvider
 */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/**
 * SMS send request
 */
export interface SendSmsRequest {
  phoneNumber: string;
  message: string;
}

/**
 * SMS send response
 */
export interface SendSmsResponse {
  messageId: string;
  success: boolean;
}

/**
 * SMS Provider Port
 *
 * Defines the contract for sending SMS messages.
 * Implementation: AWS SNS adapter in infrastructure layer.
 */
export interface SmsProviderPort {
  send(request: SendSmsRequest): Promise<SendSmsResponse>;
}
