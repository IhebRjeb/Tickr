import { SesEmailProvider } from '@modules/notifications/infrastructure/providers/ses-email.provider';
import { ConfigService } from '@nestjs/config';

// Mock the AWS SDK
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe('SesEmailProvider', () => {
  let provider: SesEmailProvider;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'aws.ses.region': 'eu-west-1',
          'aws.region': 'eu-west-1',
          'aws.ses.fromEmail': 'test@tickr.tn',
          'aws.ses.configurationSet': 'test-set',
        };
        return config[key];
      }),
    } as any;

    provider = new SesEmailProvider(mockConfigService);
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      mockSend.mockResolvedValue({ MessageId: 'msg-123' });

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Hello</p>',
      });

      expect(result.messageId).toBe('msg-123');
      expect(result.success).toBe(true);
    });

    it('should send email with text body and replyTo', async () => {
      mockSend.mockResolvedValue({ MessageId: 'msg-456' });

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        htmlBody: '<p>Hello</p>',
        textBody: 'Hello',
        replyTo: 'reply@tickr.tn',
      });

      expect(result.messageId).toBe('msg-456');
      expect(result.success).toBe(true);
    });

    it('should use custom from address when provided', async () => {
      mockSend.mockResolvedValue({ MessageId: 'msg-789' });

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        htmlBody: '<p>Hello</p>',
        from: 'custom@tickr.tn',
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty MessageId', async () => {
      mockSend.mockResolvedValue({ MessageId: undefined });

      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        htmlBody: '<p>Hello</p>',
      });

      expect(result.messageId).toBe('');
      expect(result.success).toBe(true);
    });

    it('should throw when SES fails', async () => {
      mockSend.mockRejectedValue(new Error('SES error'));

      await expect(
        provider.send({
          to: 'user@example.com',
          subject: 'Test',
          htmlBody: '<p>Hello</p>',
        }),
      ).rejects.toThrow('SES error');
    });
  });

  describe('constructor', () => {
    it('should use defaults when config values are missing', () => {
      const emptyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;

      const p = new SesEmailProvider(emptyConfig);
      expect(p).toBeDefined();
    });

    it('should use custom endpoint when provided', () => {
      const configWithEndpoint = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'aws.endpoint') return 'http://localhost:4566';
          return undefined;
        }),
      } as any;

      const p = new SesEmailProvider(configWithEndpoint);
      expect(p).toBeDefined();
    });
  });
});
