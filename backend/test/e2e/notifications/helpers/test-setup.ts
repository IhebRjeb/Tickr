/**
 * @file Notifications E2E Test Helpers
 * @description In-memory repositories, mock providers, and test data factories
 */

import type {
  EmailProviderPort,
  SendEmailRequest,
  SendEmailResponse,
} from '@modules/notifications/application/ports/email-provider.port';
import type {
  NotificationPreferenceRepositoryPort,
} from '@modules/notifications/application/ports/notification-preference.repository.port';
import type {
  NotificationTemplateRepositoryPort,
} from '@modules/notifications/application/ports/notification-template.repository.port';
import type {
  NotificationRepositoryPort,
} from '@modules/notifications/application/ports/notification.repository.port';
import type {
  RateLimiterPort,
} from '@modules/notifications/application/ports/rate-limiter.port';
import type {
  SmsProviderPort,
  SendSmsRequest,
  SendSmsResponse,
} from '@modules/notifications/application/ports/sms-provider.port';
import type {
  TemplateRendererPort,
  RenderedTemplate,
} from '@modules/notifications/application/ports/template-renderer.port';
import { NotificationPreferenceEntity } from '@modules/notifications/domain/entities/notification-preference.entity';
import { NotificationTemplateEntity } from '@modules/notifications/domain/entities/notification-template.entity';
import { NotificationEntity } from '@modules/notifications/domain/entities/notification.entity';
import { NotificationChannel } from '@modules/notifications/domain/value-objects/notification-channel.vo';
import { NotificationStatus } from '@modules/notifications/domain/value-objects/notification-status.vo';
import { TemplateCategory } from '@modules/notifications/domain/value-objects/template-category.vo';

// ============================================
// Deterministic Test UUIDs
// ============================================

export const TEST_USER_IDS = {
  user1: '40000000-0000-4000-8000-000000000001',
  user2: '40000000-0000-4000-8000-000000000002',
  admin: '40000000-0000-4000-8000-000000000003',
};

// ============================================
// In-Memory Notification Repository
// ============================================

export class InMemoryNotificationRepository implements NotificationRepositoryPort {
  private notifications: Map<string, NotificationEntity> = new Map();

  async findById(id: string): Promise<NotificationEntity | null> {
    return this.notifications.get(id) ?? null;
  }

  async save(entity: NotificationEntity): Promise<NotificationEntity> {
    this.notifications.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.notifications.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.notifications.has(id);
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: NotificationEntity[]; total: number }> {
    const all = [...this.notifications.values()].filter(
      (n) => n.userId === userId,
    );
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length };
  }

  async findByStatus(
    status: NotificationStatus,
    limit: number,
  ): Promise<NotificationEntity[]> {
    return [...this.notifications.values()]
      .filter((n) => n.status === status)
      .slice(0, limit);
  }

  async findReadyToSend(limit: number): Promise<NotificationEntity[]> {
    const now = new Date();
    return [...this.notifications.values()]
      .filter(
        (n) =>
          n.status === NotificationStatus.PENDING &&
          (!n.scheduledFor || n.scheduledFor <= now),
      )
      .slice(0, limit);
  }

  async findFailedRetryable(limit: number): Promise<NotificationEntity[]> {
    return [...this.notifications.values()]
      .filter((n) => n.status === NotificationStatus.FAILED && n.retryCount < 3)
      .slice(0, limit);
  }

  async countByUserSince(userId: string, since: Date): Promise<number> {
    return [...this.notifications.values()].filter(
      (n) => n.userId === userId && n.createdAt >= since,
    ).length;
  }

  async countByStatusSince(
    status: NotificationStatus,
    since: Date,
  ): Promise<number> {
    return [...this.notifications.values()].filter(
      (n) => n.status === status && n.createdAt >= since,
    ).length;
  }

  clear(): void {
    this.notifications.clear();
  }

  getAll(): NotificationEntity[] {
    return [...this.notifications.values()];
  }
}

// ============================================
// In-Memory NotificationPreference Repository
// ============================================

export class InMemoryNotificationPreferenceRepository
  implements NotificationPreferenceRepositoryPort
{
  private preferences: Map<string, NotificationPreferenceEntity> = new Map();

  async findById(id: string): Promise<NotificationPreferenceEntity | null> {
    return this.preferences.get(id) ?? null;
  }

  async save(
    entity: NotificationPreferenceEntity,
  ): Promise<NotificationPreferenceEntity> {
    this.preferences.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.preferences.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.preferences.has(id);
  }

  async findByUserId(
    userId: string,
  ): Promise<NotificationPreferenceEntity | null> {
    for (const pref of this.preferences.values()) {
      if (pref.userId === userId) return pref;
    }
    return null;
  }

  async findByUnsubscribeToken(
    token: string,
  ): Promise<NotificationPreferenceEntity | null> {
    for (const pref of this.preferences.values()) {
      if (pref.unsubscribeToken === token) return pref;
    }
    return null;
  }

  clear(): void {
    this.preferences.clear();
  }
}

// ============================================
// In-Memory NotificationTemplate Repository
// ============================================

export class InMemoryNotificationTemplateRepository
  implements NotificationTemplateRepositoryPort
{
  private templates: Map<string, NotificationTemplateEntity> = new Map();

  async findById(id: string): Promise<NotificationTemplateEntity | null> {
    return this.templates.get(id) ?? null;
  }

  async save(
    entity: NotificationTemplateEntity,
  ): Promise<NotificationTemplateEntity> {
    this.templates.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.templates.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.templates.has(id);
  }

  async findBySlug(slug: string): Promise<NotificationTemplateEntity | null> {
    for (const t of this.templates.values()) {
      if (t.slug === slug) return t;
    }
    return null;
  }

  async findByChannel(
    channel: NotificationChannel,
  ): Promise<NotificationTemplateEntity[]> {
    return [...this.templates.values()].filter(
      (t) => t.channel === channel,
    );
  }

  async findActive(): Promise<NotificationTemplateEntity[]> {
    return [...this.templates.values()].filter((t) => t.isActive);
  }

  seedTemplate(
    slug: string,
    channel: NotificationChannel = NotificationChannel.EMAIL,
  ): NotificationTemplateEntity {
    const result = NotificationTemplateEntity.create({
      name: `Template ${slug}`,
      slug,
      channel,
      category: TemplateCategory.TRANSACTIONAL,
      body: '<p>Hello {{name}}</p>',
      subject: channel === NotificationChannel.EMAIL ? 'Hello {{name}}' : null,
      requiredVariables: ['name'],
      defaultVariables: {},
    });
    const template = result.value;
    this.templates.set(template.id, template);
    return template;
  }

  clear(): void {
    this.templates.clear();
  }
}

// ============================================
// Mock Email Provider
// ============================================

export class MockEmailProvider implements EmailProviderPort {
  private sentEmails: SendEmailRequest[] = [];

  async send(request: SendEmailRequest): Promise<SendEmailResponse> {
    this.sentEmails.push(request);
    return { messageId: `email-${Date.now()}`, success: true };
  }

  getSentEmails(): SendEmailRequest[] {
    return [...this.sentEmails];
  }

  clear(): void {
    this.sentEmails = [];
  }
}

// ============================================
// Mock SMS Provider
// ============================================

export class MockSmsProvider implements SmsProviderPort {
  private sentSms: SendSmsRequest[] = [];

  async send(request: SendSmsRequest): Promise<SendSmsResponse> {
    this.sentSms.push(request);
    return { messageId: `sms-${Date.now()}`, success: true };
  }

  getSentSms(): SendSmsRequest[] {
    return [...this.sentSms];
  }

  clear(): void {
    this.sentSms = [];
  }
}

// ============================================
// Mock Template Renderer
// ============================================

export class MockTemplateRenderer implements TemplateRendererPort {
  async render(
    _templateSlug: string,
    data: Record<string, unknown>,
  ): Promise<RenderedTemplate> {
    return {
      subject: `Subject for ${data['name'] ?? 'user'}`,
      htmlBody: `<p>Hello ${data['name'] ?? 'user'}</p>`,
      textBody: `Hello ${data['name'] ?? 'user'}`,
    };
  }
}

// ============================================
// Mock Rate Limiter (always allows)
// ============================================

export class MockRateLimiter implements RateLimiterPort {
  private allowed = true;

  async isAllowed(_userId: string): Promise<boolean> {
    return this.allowed;
  }

  async isEmailAllowed(): Promise<boolean> {
    return this.allowed;
  }

  async isSmsAllowed(): Promise<boolean> {
    return this.allowed;
  }

  async record(_userId: string): Promise<void> {}
  async recordEmail(): Promise<void> {}
  async recordSms(): Promise<void> {}

  setAllowed(allowed: boolean): void {
    this.allowed = allowed;
  }

  clear(): void {
    this.allowed = true;
  }
}

// ============================================
// Mock Domain Event Publisher
// ============================================

export class MockDomainEventPublisher {
  private publishedEvents: unknown[] = [];

  publishAll(events: unknown[]): void {
    this.publishedEvents.push(...events);
  }

  publishFromAggregate(aggregate: { pullDomainEvents: () => unknown[] }): void {
    const events = aggregate.pullDomainEvents();
    this.publishedEvents.push(...events);
  }

  getPublishedEvents(): unknown[] {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

// ============================================
// JWT Token Generator
// ============================================

export function generateTestToken(
  jwtService: { sign: (payload: Record<string, unknown>) => string },
  payload: { userId: string; email: string; role: string },
): string {
  return jwtService.sign({
    sub: payload.userId,
    email: payload.email,
    role: payload.role,
  });
}
