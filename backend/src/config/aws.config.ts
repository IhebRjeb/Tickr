import { registerAs } from '@nestjs/config';

/**
 * AWS Configuration
 *
 * Configuration for AWS services used by the application.
 * Supports both local development (LocalStack) and production (AWS).
 *
 * Environment Variables:
 * - AWS_REGION: AWS region (default: eu-west-1)
 * - AWS_ACCESS_KEY_ID: AWS access key (for local dev, use 'test')
 * - AWS_SECRET_ACCESS_KEY: AWS secret key (for local dev, use 'test')
 * - AWS_S3_BUCKET: S3 bucket name for images
 * - AWS_S3_ENDPOINT: Custom endpoint for LocalStack (optional)
 * - AWS_CLOUDFRONT_URL: CloudFront distribution URL (optional)
 */
export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'tickr-event-images',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined, // For LocalStack: http://localhost:4566
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true', // Required for LocalStack
  },
  cloudFront: {
    url: process.env.AWS_CLOUDFRONT_URL || undefined, // e.g., https://d1234567890.cloudfront.net
  },
  ses: {
    fromEmail: process.env.SES_FROM_EMAIL || 'noreply@tickr.local',
    region: process.env.SES_REGION || process.env.AWS_REGION || 'eu-west-1',
    configurationSet:
      process.env.SES_CONFIGURATION_SET || 'tickr-notifications',
  },
  sns: {
    region: process.env.SNS_REGION || process.env.AWS_REGION || 'eu-west-1',
    topicArn: process.env.SNS_TOPIC_ARN || '',
  },
}));

/**
 * AWS Config Type for type safety
 */
export interface AwsConfig {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  s3: {
    bucket: string;
    endpoint?: string;
    forcePathStyle: boolean;
  };
  cloudFront: {
    url?: string;
  };
  ses: {
    fromEmail: string;
    region: string;
    configurationSet: string;
  };
  sns: {
    region: string;
    topicArn: string;
  };
}
