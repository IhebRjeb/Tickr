import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  EmailProviderPort,
  SendEmailRequest,
  SendEmailResponse,
} from '../../application/ports/email-provider.port';

/**
 * AWS SES Email Provider Adapter
 *
 * Sends emails via AWS SES (Simple Email Service).
 * Uses SESv2 client for modern API support.
 */
@Injectable()
export class SesEmailProvider implements EmailProviderPort {
  private readonly logger = new Logger(SesEmailProvider.name);
  private readonly client: SESv2Client;
  private readonly fromEmail: string;
  private readonly configurationSet: string;

  constructor(private readonly configService: ConfigService) {
    const region =
      this.configService.get<string>('aws.ses.region') ??
      this.configService.get<string>('aws.region') ??
      'us-east-1';
    const endpoint = this.configService.get<string>('aws.endpoint');

    this.client = new SESv2Client({
      region,
      ...(endpoint && { endpoint }),
    });

    this.fromEmail =
      this.configService.get<string>('aws.ses.fromEmail') ??
      'noreply@tickr.tn';
    this.configurationSet =
      this.configService.get<string>('aws.ses.configurationSet') ?? '';
  }

  async send(request: SendEmailRequest): Promise<SendEmailResponse> {
    this.logger.debug(`Sending email to ${request.to}: ${request.subject}`);

    try {
      const command = new SendEmailCommand({
        FromEmailAddress: request.from ?? this.fromEmail,
        Destination: {
          ToAddresses: [request.to],
        },
        Content: {
          Simple: {
            Subject: {
              Data: request.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: request.htmlBody,
                Charset: 'UTF-8',
              },
              ...(request.textBody && {
                Text: {
                  Data: request.textBody,
                  Charset: 'UTF-8',
                },
              }),
            },
          },
        },
        ...(request.replyTo && {
          ReplyToAddresses: [request.replyTo],
        }),
        ...(this.configurationSet && {
          ConfigurationSetName: this.configurationSet,
        }),
      });

      const result = await this.client.send(command);

      this.logger.log(
        `Email sent to ${request.to}, messageId: ${result.MessageId}`,
      );

      return {
        messageId: result.MessageId ?? '',
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${request.to}: ${error}`,
      );
      throw error;
    }
  }
}
