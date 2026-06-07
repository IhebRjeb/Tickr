import type { RenderedTemplate } from '../models/template-renderer.model';

export type { RenderedTemplate };

/**
 * Injection token for TemplateRenderer
 */
export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');

/**
 * Template Renderer Port
 *
 * Defines the contract for rendering notification templates.
 * Implementation: Handlebars-based renderer in infrastructure layer.
 */
export interface TemplateRendererPort {
  render(
    templateSlug: string,
    data: Record<string, unknown>,
  ): Promise<RenderedTemplate>;
}
