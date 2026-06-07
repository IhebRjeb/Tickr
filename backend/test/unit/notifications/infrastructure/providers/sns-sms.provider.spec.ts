import { SnsSmsProvider } from '@modules/notifications/infrastructure/providers/sns-sms.provider';
import { ConfigService } from '@nestjs/config';

// Mock the AWS SDK
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe('SnsSmsProvider', () => {
  let provider: SnsSmsProvider;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'aws.sns.region': 'eu-west-1',
          'aws.region': 'eu-west-1',
        };
        return config[key];
      }),
    } as any;

    provider = new SnsSmsProvider(mockConfigService);
  });

  describe('send', () => {
    it('should send SMS successfully', async () => {
      mockSend.mockResolvedValue({ MessageId: 'sms-123' });

      const result = await provider.send({
        phoneNumber: '+21612345678',
        message: 'Your code is 1234',
      });

      expect(result.messageId).toBe('sms-123');
      expect(result.success).toBe(true);
    });

    it('should handle empty MessageId', async () => {
      mockSend.mockResolvedValue({ MessageId: undefined });

      const result = await provider.send({
        phoneNumber: '+21698765432',
        message: 'Test',
      });

      expect(result.messageId).toBe('');
      expect(result.success).toBe(true);
    });

    it('should throw when SNS fails', async () => {
      mockSend.mockRejectedValue(new Error('SNS error'));

      await expect(
        provider.send({
          phoneNumber: '+21612345678',
          message: 'Test',
        }),
      ).rejects.toThrow('SNS error');
    });
  });

  describe('constructor', () => {
    it('should use defaults when config values are missing', () => {
      const emptyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;

      const p = new SnsSmsProvider(emptyConfig);
      expect(p).toBeDefined();
    });

    it('should use custom endpoint when provided', () => {
      const configWithEndpoint = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'aws.endpoint') return 'http://localhost:4566';
          return undefined;
        }),
      } as any;

      const p = new SnsSmsProvider(configWithEndpoint);
      expect(p).toBeDefined();
    });
  });
});
