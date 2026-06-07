/**
 * Payment Method Value Object
 *
 * Defines the supported payment gateways.
 * Extensible: adding a new gateway requires adding an entry here
 * and registering the adapter in PaymentProviderFactory.
 */
export enum PaymentMethod {
  STRIPE = 'STRIPE',
  KONNECT = 'KONNECT',
  PAYMEE = 'PAYMEE',
  // Future: CLICTOPAY = 'CLICTOPAY', FAWRY = 'FAWRY', CMI = 'CMI'
}

/**
 * Check if a string is a valid payment method
 */
export function isValidPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}
