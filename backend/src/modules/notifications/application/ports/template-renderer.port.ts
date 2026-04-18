/**
 * Injection token for TemplateRenderer
 */
export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');

/**
 * Rendered template output
 */
export interface RenderedTemplate {
  subject: string | null;
  htmlBody: string;
  textBody: string;
}

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
