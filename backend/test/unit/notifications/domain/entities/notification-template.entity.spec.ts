/**
 * @file NotificationTemplate Entity Unit Tests
 * @description Tests for the notification template entity
 */

import {
  NotificationTemplateEntity,
  NotificationChannel,
  TemplateCategory,
  InvalidTemplateException,
} from '@modules/notifications/domain';

describe('NotificationTemplateEntity', () => {
  // ============================================
  // Helper Functions
  // ============================================

  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  const createValidProps = (overrides: Record<string, unknown> = {}) => ({
    name: 'Welcome Email',
    slug: 'welcome-email',
    channel: NotificationChannel.EMAIL,
    category: TemplateCategory.TRANSACTIONAL,
    subject: 'Welcome to Tickr!',
    body: '<h1>Welcome {{name}}</h1>',
    requiredVariables: ['name'],
    defaultVariables: {},
    ...overrides,
  });

  const createTemplate = (
    overrides: Record<string, unknown> = {},
  ): NotificationTemplateEntity => {
    const result = NotificationTemplateEntity.create(
      createValidProps(overrides),
    );
    expect(result.isSuccess).toBe(true);
    return result.value;
  };

  const createReconstituted = (
    overrides: Record<string, unknown> = {},
  ): NotificationTemplateEntity => {
    return NotificationTemplateEntity.reconstitute({
      id: validUUID,
      name: 'Welcome Email',
      slug: 'welcome-email',
      channel: NotificationChannel.EMAIL,
      category: TemplateCategory.TRANSACTIONAL,
      subject: 'Welcome to Tickr!',
      body: '<h1>Welcome {{name}}</h1>',
      requiredVariables: ['name'],
      defaultVariables: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  // ============================================
  // create()
  // ============================================

  describe('create()', () => {
    describe('Success Cases', () => {
      it('should create a valid template', () => {
        const result = NotificationTemplateEntity.create(createValidProps());
        expect(result.isSuccess).toBe(true);

        const template = result.value;
        expect(template.name).toBe('Welcome Email');
        expect(template.slug).toBe('welcome-email');
        expect(template.channel).toBe(NotificationChannel.EMAIL);
        expect(template.category).toBe(TemplateCategory.TRANSACTIONAL);
        expect(template.subject).toBe('Welcome to Tickr!');
        expect(template.isActive).toBe(true);
      });

      it('should set isActive to true by default', () => {
        const template = createTemplate();
        expect(template.isActive).toBe(true);
      });

      it('should generate unique IDs', () => {
        const t1 = createTemplate();
        const t2 = createTemplate();
        expect(t1.id).not.toBe(t2.id);
      });

      it('should trim name and slug', () => {
        const template = createTemplate({
          name: '  Welcome Email  ',
          slug: 'welcome-email',
        });
        expect(template.name).toBe('Welcome Email');
      });

      it('should allow SMS template without subject', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({
            channel: NotificationChannel.SMS,
            subject: null,
          }),
        );
        expect(result.isSuccess).toBe(true);
      });

      it('should store requiredVariables as a copy', () => {
        const vars = ['name', 'email'];
        const template = createTemplate({ requiredVariables: vars });
        const returned = template.requiredVariables;
        returned.push('injected');
        expect(template.requiredVariables).not.toContain('injected');
      });

      it('should store defaultVariables as a copy', () => {
        const defaults = { platform: 'Tickr' };
        const template = createTemplate({ defaultVariables: defaults });
        const returned = template.defaultVariables;
        returned['injected'] = 'yes';
        expect(template.defaultVariables).not.toHaveProperty('injected');
      });
    });

    describe('Validation Failures', () => {
      it('should fail with empty name', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ name: '' }),
        );
        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidTemplateException);
      });

      it('should fail with empty slug', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ slug: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with invalid slug format (uppercase)', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ slug: 'Welcome-Email' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with invalid slug format (spaces)', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ slug: 'welcome email' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with invalid slug format (underscores)', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ slug: 'welcome_email' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should accept valid slug formats', () => {
        const validSlugs = [
          'welcome',
          'welcome-email',
          'password-reset-v2',
          'a',
          'a-b-c',
        ];
        for (const slug of validSlugs) {
          const result = NotificationTemplateEntity.create(
            createValidProps({ slug }),
          );
          expect(result.isSuccess).toBe(true);
        }
      });

      it('should fail with empty body', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ body: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail when EMAIL template has no subject', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ subject: null }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail when EMAIL template has empty subject', () => {
        const result = NotificationTemplateEntity.create(
          createValidProps({ subject: '' }),
        );
        expect(result.isFailure).toBe(true);
      });
    });
  });

  // ============================================
  // reconstitute()
  // ============================================

  describe('reconstitute()', () => {
    it('should reconstitute with all properties', () => {
      const template = createReconstituted();
      expect(template.id).toBe(validUUID);
      expect(template.name).toBe('Welcome Email');
      expect(template.slug).toBe('welcome-email');
    });

    it('should reconstitute inactive template', () => {
      const template = createReconstituted({ isActive: false });
      expect(template.isActive).toBe(false);
    });
  });

  // ============================================
  // validateData()
  // ============================================

  describe('validateData()', () => {
    it('should succeed when all required variables provided', () => {
      const template = createTemplate({ requiredVariables: ['name', 'email'] });
      const result = template.validateData({ name: 'John', email: 'j@t.com' });
      expect(result.isSuccess).toBe(true);
    });

    it('should fail when required variable is missing', () => {
      const template = createTemplate({ requiredVariables: ['name', 'email'] });
      const result = template.validateData({ name: 'John' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(InvalidTemplateException);
    });

    it('should fail when required variable is null', () => {
      const template = createTemplate({ requiredVariables: ['name'] });
      const result = template.validateData({ name: null });
      expect(result.isFailure).toBe(true);
    });

    it('should succeed when defaultVariables fill in gaps', () => {
      const template = createTemplate({
        requiredVariables: ['name', 'platform'],
        defaultVariables: { platform: 'Tickr' },
      });
      const result = template.validateData({ name: 'John' });
      expect(result.isSuccess).toBe(true);
    });

    it('should succeed with no required variables', () => {
      const template = createTemplate({ requiredVariables: [] });
      const result = template.validateData({});
      expect(result.isSuccess).toBe(true);
    });

    it('should allow extra variables beyond required', () => {
      const template = createTemplate({ requiredVariables: ['name'] });
      const result = template.validateData({
        name: 'John',
        extra: 'not-needed',
      });
      expect(result.isSuccess).toBe(true);
    });
  });

  // ============================================
  // activate() / deactivate()
  // ============================================

  describe('activate() / deactivate()', () => {
    it('should deactivate an active template', () => {
      const template = createTemplate();
      expect(template.isActive).toBe(true);

      template.deactivate();
      expect(template.isActive).toBe(false);
    });

    it('should activate an inactive template', () => {
      const template = createReconstituted({ isActive: false });
      expect(template.isActive).toBe(false);

      template.activate();
      expect(template.isActive).toBe(true);
    });
  });

  // ============================================
  // updateContent()
  // ============================================

  describe('updateContent()', () => {
    it('should update body', () => {
      const template = createTemplate();
      template.updateContent('<h1>New Body</h1>');
      expect(template.body).toBe('<h1>New Body</h1>');
    });

    it('should update body and subject', () => {
      const template = createTemplate();
      template.updateContent('<h1>Body</h1>', 'New Subject');
      expect(template.body).toBe('<h1>Body</h1>');
      expect(template.subject).toBe('New Subject');
    });

    it('should not change subject when not provided', () => {
      const template = createTemplate();
      const originalSubject = template.subject;
      template.updateContent('<h1>Body</h1>');
      expect(template.subject).toBe(originalSubject);
    });
  });

  // ============================================
  // updateRequiredVariables()
  // ============================================

  describe('updateRequiredVariables()', () => {
    it('should update required variables', () => {
      const template = createTemplate({ requiredVariables: ['name'] });
      template.updateRequiredVariables(['name', 'email', 'date']);
      expect(template.requiredVariables).toEqual(['name', 'email', 'date']);
    });

    it('should store a copy of provided array', () => {
      const template = createTemplate();
      const vars = ['a', 'b'];
      template.updateRequiredVariables(vars);
      vars.push('injected');
      expect(template.requiredVariables).not.toContain('injected');
    });
  });

  // ============================================
  // clone()
  // ============================================

  describe('clone()', () => {
    it('should create an independent copy', () => {
      const template = createTemplate();
      const clone = template.clone();
      expect(clone.id).toBe(template.id);
      expect(clone.slug).toBe(template.slug);
      expect(clone).not.toBe(template);
    });
  });
});
