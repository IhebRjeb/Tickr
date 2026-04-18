import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when required template variables are missing
 */
export class TemplateVariableMissingException extends DomainException {
  constructor(message: string) {
    super(message, 'TEMPLATE_VARIABLE_MISSING');
  }

  static missingVariables(
    templateId: string,
    missing: string[],
  ): TemplateVariableMissingException {
    return new TemplateVariableMissingException(
      `Template ${templateId} is missing required variables: ${missing.join(', ')}`,
    );
  }
}
