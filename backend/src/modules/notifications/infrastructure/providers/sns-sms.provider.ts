import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  SmsProviderPort,
  SendSmsRequest,
  SendSmsResponse,
} from '../../application/ports/sms-provider.port';

/**
 * AWS SNS SMS Provider Adapter
 *
 * Sends SMS messages via AWS SNS (Simple Notification Service).
 */
@Injectable()
export class SnsSmsProvider implements SmsProviderPort {
  private readonly logger = new Logger(SnsSmsProvider.name);
  private readonly client: SNSClient;

  constructor(private readonly configService: ConfigService) {
    const region =
      this.configService.get<string>('aws.sns.region') ??
      this.configService.get<string>('aws.region') ??
      'us-east-1';
    const endpoint = this.configService.get<string>('aws.endpoint');

    this.client = new SNSClient({
      region,
      ...(endpoint && { endpoint }),
    });
  }

  async send(request: SendSmsRequest): Promise<SendSmsResponse> {
    this.logger.debug(
      `Sending SMS to ${request.phoneNumber}`,
    );

    try {
      const command = new PublishCommand({
        PhoneNumber: request.phoneNumber,
        Message: request.message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });

      const result = await this.client.send(command);

      this.logger.log(
        `SMS sent to ${request.phoneNumber}, messageId: ${result.MessageId}`,
      );

      return {
        messageId: result.MessageId ?? '',
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${request.phoneNumber}: ${error}`,
      );
      throw error;
    }
  }
}
