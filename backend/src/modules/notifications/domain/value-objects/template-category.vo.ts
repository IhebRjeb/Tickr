/**
 * Template Category Enum
 *
 * Categorizes notification templates:
 * - TRANSACTIONAL: Order confirmations, password resets (critical, cannot unsubscribe)
 * - MARKETING: Promotions, new events (opt-in required)
 * - SYSTEM: Account updates, security alerts (critical)
 */
export enum TemplateCategory {
  TRANSACTIONAL = 'TRANSACTIONAL',
  MARKETING = 'MARKETING',
  SYSTEM = 'SYSTEM',
}
