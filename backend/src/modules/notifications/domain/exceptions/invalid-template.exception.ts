import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a template validation or rendering error occurs
 */
export class InvalidTemplateException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_TEMPLATE');
  }

  static missingId(): InvalidTemplateException {
    return new InvalidTemplateException('Template ID (slug) is required');
  }

  static missingName(): InvalidTemplateException {
    return new InvalidTemplateException('Template name is required');
  }

  static missingSubject(): InvalidTemplateException {
    return new InvalidTemplateException('Template subject is required');
  }

  static missingBody(): InvalidTemplateException {
    return new InvalidTemplateException(
      'Template body (HTML and text) is required',
    );
  }

  static renderingFailed(reason: string): InvalidTemplateException {
    return new InvalidTemplateException(
      `Template rendering failed: ${reason}`,
    );
  }

  static invalidSlug(slug: string): InvalidTemplateException {
    return new InvalidTemplateException(
      `Template slug must be lowercase alphanumeric with hyphens: ${slug}`,
    );
  }
}
