import { Inject, Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

import {
  TemplateRendererPort,
  RenderedTemplate,
} from '../../application/ports/template-renderer.port';
import {
  NOTIFICATION_TEMPLATE_REPOSITORY,
  type NotificationTemplateRepositoryPort,
} from '../../application/ports/notification-template.repository.port';

/**
 * Handlebars Template Renderer
 *
 * Renders notification templates using Handlebars templating engine.
 * Loads templates from the database via the template repository.
 */
@Injectable()
export class HandlebarsTemplateRenderer implements TemplateRendererPort {
  private readonly logger = new Logger(HandlebarsTemplateRenderer.name);
  private readonly compiledCache = new Map<
    string,
    { body: HandlebarsTemplateDelegate; subject?: HandlebarsTemplateDelegate }
  >();

  constructor(
    @Inject(NOTIFICATION_TEMPLATE_REPOSITORY)
    private readonly templateRepo: NotificationTemplateRepositoryPort,
  ) {}

  async render(
    templateSlug: string,
    data: Record<string, unknown>,
  ): Promise<RenderedTemplate> {
    this.logger.debug(`Rendering template: ${templateSlug}`);

    // Check compile cache
    let compiled = this.compiledCache.get(templateSlug);

    if (!compiled) {
      const template =
        await this.templateRepo.findBySlug(templateSlug);

      if (!template) {
        throw new Error(`Template '${templateSlug}' not found`);
      }

      // Validate required variables
      const validationResult = template.validateData(data);
      if (validationResult.isFailure) {
        throw new Error(validationResult.error.message);
      }

      const bodyCompiled = Handlebars.compile(template.body);
      const subjectCompiled = template.subject
        ? Handlebars.compile(template.subject)
        : undefined;

      compiled = { body: bodyCompiled, subject: subjectCompiled };
      this.compiledCache.set(templateSlug, compiled);
    }

    const mergedData = { ...data };
    const htmlBody = compiled.body(mergedData);
    const subject = compiled.subject
      ? compiled.subject(mergedData)
      : null;

    // Generate plain text by stripping HTML tags
    const textBody = htmlBody.replace(/<[^>]+>/g, '').trim();

    return { subject, htmlBody, textBody };
  }

  /**
   * Clear the template cache (e.g., after template update)
   */
  clearCache(slug?: string): void {
    if (slug) {
      this.compiledCache.delete(slug);
    } else {
      this.compiledCache.clear();
    }
  }
}
