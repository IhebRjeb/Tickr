import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Ticket S3 Storage Service
 *
 * Handles PDF ticket upload, deletion, and signed URL generation.
 * Follows the same S3 client pattern as the Events module S3StorageService.
 *
 * Path Structure: tickets/{env}/{ticketId}.pdf
 * Signed URL Expiration: 7 days
 */
@Injectable()
export class TicketS3StorageService {
  private readonly logger = new Logger(TicketS3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly nodeEnv: string;

  private static readonly SIGNED_URL_EXPIRATION = 7 * 24 * 60 * 60; // 7 days

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region', 'eu-west-1');
    const endpoint = this.configService.get<string>('aws.s3.endpoint');
    const forcePathStyle = this.configService.get<boolean>(
      'aws.s3.forcePathStyle',
      false,
    );
    const accessKeyId = this.configService.get<string>(
      'aws.credentials.accessKeyId',
      'test',
    );
    const secretAccessKey = this.configService.get<string>(
      'aws.credentials.secretAccessKey',
      'test',
    );

    this.bucket = this.configService.get<string>(
      'aws.s3.bucket',
      'tickr-tickets',
    );
    this.nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      ...(endpoint && { endpoint }),
      forcePathStyle,
    });

    this.logger.log(
      `Ticket S3 Storage initialized - Bucket: ${this.bucket}, Region: ${region}`,
    );
  }

  /**
   * Upload a PDF buffer to S3
   *
   * @param ticketId - Ticket UUID used as the object key
   * @param pdf - PDF buffer
   * @returns The S3 object key
   */
  async uploadPDF(ticketId: string, pdf: Buffer): Promise<string> {
    const key = this.buildKey(ticketId);

    this.logger.debug(`Uploading PDF for ticket ${ticketId}: ${key}`);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: pdf,
        ContentType: 'application/pdf',
        ContentDisposition: `attachment; filename="ticket-${ticketId}.pdf"`,
        CacheControl: 'max-age=31536000',
      }),
    );

    this.logger.log(`PDF uploaded for ticket ${ticketId}: ${key}`);
    return key;
  }

  /**
   * Generate a signed URL for downloading a ticket PDF
   *
   * @param key - The S3 object key (returned from uploadPDF)
   * @returns Pre-signed URL valid for 7 days
   */
  async generateSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: TicketS3StorageService.SIGNED_URL_EXPIRATION,
    });
  }

  /**
   * Delete a ticket PDF from S3
   *
   * @param key - The S3 object key
   */
  async deletePDF(key: string): Promise<void> {
    this.logger.debug(`Deleting PDF: ${key}`);

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    this.logger.debug(`PDF deleted: ${key}`);
  }

  /**
   * Build the S3 key for a ticket PDF
   */
  private buildKey(ticketId: string): string {
    return `tickets/${this.nodeEnv}/${ticketId}.pdf`;
  }
}
