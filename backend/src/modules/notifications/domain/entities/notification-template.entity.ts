import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';

import { InvalidTemplateException } from '../exceptions/invalid-template.exception';
import { NotificationChannel } from '../value-objects/notification-channel.vo';
import { TemplateCategory } from '../value-objects/template-category.vo';

// ============================================
// Internal Interfaces (Not Exported)
// ============================================

/**
 * Props for creating a new template
 * @internal
 */
interface CreateTemplateProps {
  id?: string;
  name: string;
  slug: string;
  channel: NotificationChannel;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  requiredVariables: string[];
  defaultVariables?: Record<string, string>;
}

/**
 * Props for reconstituting a template from persistence
 * @internal
 */
interface TemplateProps {
  id: string;
  name: string;
  slug: string;
  channel: NotificationChannel;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  requiredVariables: string[];
  defaultVariables: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NotificationTemplate Entity
 *
 * Defines reusable notification templates with Handlebars placeholders.
 *
 * Business Rules:
 * - Templates are identified by unique slugs (e.g., 'welcome-email')
 * - EMAIL templates require a subject
 * - Required variables must be provided when rendering
 * - Default variables fill in missing optional values
 * - Templates can be activated/deactivated
 */
export class NotificationTemplateEntity extends BaseEntity<NotificationTemplateEntity> {
  // ============================================
  // Private Properties
  // ============================================

  private _name: string;
  private _slug: string;
  private _channel: NotificationChannel;
  private _category: TemplateCategory;
  private _subject: string | null;
  private _body: string;
  private _requiredVariables: string[];
  private _defaultVariables: Record<string, string>;
  private _isActive: boolean;

  // ============================================
  // Constructor
  // ============================================

  private constructor(props: TemplateProps) {
    super(props.id, props.createdAt);
    this._name = props.name;
    this._slug = props.slug;
    this._channel = props.channel;
    this._category = props.category;
    this._subject = props.subject;
    this._body = props.body;
    this._requiredVariables = [...props.requiredVariables];
    this._defaultVariables = { ...props.defaultVariables };
    this._isActive = props.isActive;
    this._updatedAt = props.updatedAt;
  }

  // ============================================
  // Getters
  // ============================================

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug;
  }

  get channel(): NotificationChannel {
    return this._channel;
  }

  get category(): TemplateCategory {
    return this._category;
  }

  get subject(): string | null {
    return this._subject;
  }

  get body(): string {
    return this._body;
  }

  get requiredVariables(): string[] {
    return [...this._requiredVariables];
  }

  get defaultVariables(): Record<string, string> {
    return { ...this._defaultVariables };
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Validate that all required variables are present in the provided data
   */
  validateData(
    data: Record<string, unknown>,
  ): Result<void, InvalidTemplateException> {
    const merged = { ...this._defaultVariables, ...data };
    const missing = this._requiredVariables.filter(
      (v) => merged[v] === undefined || merged[v] === null,
    );

    if (missing.length > 0) {
      return Result.fail(
        InvalidTemplateException.renderingFailed(
          this._slug,
          `Missing required variables: ${missing.join(', ')}`,
        ),
      );
    }

    return Result.okVoid();
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create a new notification template
   */
  static create(
    props: CreateTemplateProps,
  ): Result<NotificationTemplateEntity, InvalidTemplateException> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail(InvalidTemplateException.missingName());
    }

    if (!props.slug || props.slug.trim().length === 0) {
      return Result.fail(InvalidTemplateException.invalidSlug(props.slug ?? ''));
    }

    // Validate slug format: lowercase, alphanumeric, hyphens only
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(props.slug)) {
      return Result.fail(InvalidTemplateException.invalidSlug(props.slug));
    }

    if (!props.body || props.body.trim().length === 0) {
      return Result.fail(InvalidTemplateException.missingBody());
    }

    // EMAIL templates require a subject
    if (
      props.channel === NotificationChannel.EMAIL &&
      (!props.subject || props.subject.trim().length === 0)
    ) {
      return Result.fail(InvalidTemplateException.missingSubject());
    }

    const id = props.id || generateUUID();
    const now = new Date();

    const template = new NotificationTemplateEntity({
      id,
      name: props.name.trim(),
      slug: props.slug.trim(),
      channel: props.channel,
      category: props.category,
      subject: props.subject?.trim() ?? null,
      body: props.body,
      requiredVariables: props.requiredVariables ?? [],
      defaultVariables: props.defaultVariables ?? {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(template);
  }

  /**
   * Reconstitute from persistence (no validation, no events)
   */
  static reconstitute(
    props: TemplateProps,
  ): NotificationTemplateEntity {
    return new NotificationTemplateEntity(props);
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Activate the template
   */
  activate(): void {
    this._isActive = true;
    this.touch();
  }

  /**
   * Deactivate the template
   */
  deactivate(): void {
    this._isActive = false;
    this.touch();
  }

  /**
   * Update the template content
   */
  updateContent(body: string, subject?: string | null): void {
    this._body = body;
    if (subject !== undefined) {
      this._subject = subject;
    }
    this.touch();
  }

  /**
   * Update required variables list
   */
  updateRequiredVariables(variables: string[]): void {
    this._requiredVariables = [...variables];
    this.touch();
  }

  // ============================================
  // BaseEntity Implementations
  // ============================================

  clone(): NotificationTemplateEntity {
    return new NotificationTemplateEntity({
      id: this._id,
      name: this._name,
      slug: this._slug,
      channel: this._channel,
      category: this._category,
      subject: this._subject,
      body: this._body,
      requiredVariables: [...this._requiredVariables],
      defaultVariables: { ...this._defaultVariables },
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    });
  }

  validate(): void {
    if (!this._name) {
      throw InvalidTemplateException.missingName();
    }
    if (!this._body) {
      throw InvalidTemplateException.missingBody();
    }
  }
}
