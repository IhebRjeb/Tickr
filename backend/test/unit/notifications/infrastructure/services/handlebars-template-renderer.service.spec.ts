import { NotificationTemplateRepositoryPort } from '@modules/notifications/application/ports/notification-template.repository.port';
import { NotificationTemplateEntity } from '@modules/notifications/domain/entities/notification-template.entity';
import { NotificationChannel } from '@modules/notifications/domain/value-objects/notification-channel.vo';
import { TemplateCategory } from '@modules/notifications/domain/value-objects/template-category.vo';
import { HandlebarsTemplateRenderer } from '@modules/notifications/infrastructure/services/handlebars-template-renderer.service';

describe('HandlebarsTemplateRenderer', () => {
  let renderer: HandlebarsTemplateRenderer;
  let mockTemplateRepo: jest.Mocked<NotificationTemplateRepositoryPort>;

  beforeEach(() => {
    mockTemplateRepo = {
      findBySlug: jest.fn(),
      findByChannel: jest.fn(),
      findActive: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    renderer = new HandlebarsTemplateRenderer(mockTemplateRepo);
  });

  const createTemplate = (overrides: Partial<{
    slug: string;
    body: string;
    subject: string | null;
    requiredVariables: string[];
    defaultVariables: Record<string, string>;
  }> = {}) => {
    const result = NotificationTemplateEntity.create({
      name: 'Test Template',
      slug: overrides.slug ?? 'test-template',
      channel: NotificationChannel.EMAIL,
      category: TemplateCategory.TRANSACTIONAL,
      body: overrides.body ?? '<h1>Hello {{name}}</h1>',
      subject: overrides.subject ?? 'Welcome {{name}}',
      requiredVariables: overrides.requiredVariables ?? ['name'],
      defaultVariables: overrides.defaultVariables ?? {},
    });
    return result.value;
  };

  describe('render', () => {
    it('should render template with data', async () => {
      const template = createTemplate();
      mockTemplateRepo.findBySlug.mockResolvedValue(template);

      const result = await renderer.render('test-template', { name: 'John' });

      expect(result.htmlBody).toBe('<h1>Hello John</h1>');
      expect(result.subject).toBe('Welcome John');
      expect(result.textBody).toBe('Hello John');
    });

    it('should cache compiled templates', async () => {
      const template = createTemplate();
      mockTemplateRepo.findBySlug.mockResolvedValue(template);

      await renderer.render('test-template', { name: 'John' });
      await renderer.render('test-template', { name: 'Jane' });

      expect(mockTemplateRepo.findBySlug).toHaveBeenCalledTimes(1);
    });

    it('should throw when template not found', async () => {
      mockTemplateRepo.findBySlug.mockResolvedValue(null);

      await expect(
        renderer.render('missing', { name: 'John' }),
      ).rejects.toThrow("Template 'missing' not found");
    });

    it('should throw when required variables missing', async () => {
      const template = createTemplate({ requiredVariables: ['name', 'email'] });
      mockTemplateRepo.findBySlug.mockResolvedValue(template);

      await expect(
        renderer.render('test-template', { name: 'John' }),
      ).rejects.toThrow(/missing required variables.*email/i);
    });

    it('should render template without subject', async () => {
      const smsResult = NotificationTemplateEntity.create({
        name: 'SMS Template',
        slug: 'no-subject',
        channel: NotificationChannel.SMS,
        category: TemplateCategory.TRANSACTIONAL,
        body: '<p>{{msg}}</p>',
        subject: null,
        requiredVariables: ['msg'],
        defaultVariables: {},
      });
      mockTemplateRepo.findBySlug.mockResolvedValue(smsResult.value);

      const result = await renderer.render('no-subject', { msg: 'hi' });

      expect(result.subject).toBeNull();
      expect(result.htmlBody).toBe('<p>hi</p>');
    });

    it('should strip HTML tags for textBody', async () => {
      const template = createTemplate({
        body: '<div><p>Hello <strong>{{name}}</strong></p></div>',
        requiredVariables: ['name'],
      });
      mockTemplateRepo.findBySlug.mockResolvedValue(template);

      const result = await renderer.render('test-template', { name: 'Test' });

      expect(result.textBody).toBe('Hello Test');
    });

    it('should use default variables from template', async () => {
      const template = createTemplate({
        slug: 'with-defaults',
        body: '<p>{{greeting}} {{name}}</p>',
        requiredVariables: ['name', 'greeting'],
        defaultVariables: { greeting: 'Hello' },
      });
      mockTemplateRepo.findBySlug.mockResolvedValue(template);

      const result = await renderer.render('with-defaults', { name: 'John', greeting: 'Hello' });

      expect(result.htmlBody).toBe('<p>Hello John</p>');
    });
  });

  describe('clearCache', () => {
    it('should clear specific slug from cache', async () => {
      const template = createTemplate();
      mockTemplateRepo.findBySlug.mockResolvedValue(template);

      await renderer.render('test-template', { name: 'John' });
      renderer.clearCache('test-template');
      await renderer.render('test-template', { name: 'Jane' });

      expect(mockTemplateRepo.findBySlug).toHaveBeenCalledTimes(2);
    });

    it('should clear entire cache', async () => {
      const template = createTemplate();
      mockTemplateRepo.findBySlug.mockResolvedValue(template);

      await renderer.render('test-template', { name: 'John' });
      renderer.clearCache();
      await renderer.render('test-template', { name: 'Jane' });

      expect(mockTemplateRepo.findBySlug).toHaveBeenCalledTimes(2);
    });
  });
});
