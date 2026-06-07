/**
 * SMS provider request/response models
 */

export interface SendSmsRequest {
  phoneNumber: string;
  message: string;
}

export interface SendSmsResponse {
  messageId: string;
  success: boolean;
}
