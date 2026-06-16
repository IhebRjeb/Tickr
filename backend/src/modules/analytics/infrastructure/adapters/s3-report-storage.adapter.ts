import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ReportStoragePort } from '../../application/ports/report-storage.port';

/**
 * S3 Report Storage Adapter
 *
 * Implements ReportStoragePort for uploading and serving analytics reports.
 * Uses the same S3 client pattern as other modules.
 */
@Injectable()
export class S3ReportStorageAdapter implements ReportStoragePort {
  private readonly logger = new Logger(S3ReportStorageAdapter.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

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
      'aws.s3.reportsBucket',
      'tickr-reports',
    );

    this.s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint && { endpoint }),
      forcePathStyle,
    });

    this.logger.log(
      `S3 Report Storage initialized - Bucket: ${this.bucket}, Region: ${region}`,
    );
  }

  async upload(
    fileName: string,
    content: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: content,
        ContentType: contentType,
      }),
    );

    this.logger.debug(`Report uploaded: ${fileName}`);
    return fileName;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return url;
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    this.logger.debug(`Report deleted: ${key}`);
  }
}
