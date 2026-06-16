/**
 * MetricType Value Object
 *
 * Defines the types of metrics that can be recorded in the analytics system.
 */
export enum MetricType {
  REVENUE = 'REVENUE',
  TICKET_SOLD = 'TICKET_SOLD',
  CHECK_IN = 'CHECK_IN',
  EVENT_CREATED = 'EVENT_CREATED',
  USER_REGISTERED = 'USER_REGISTERED',
  REFUND = 'REFUND',
}

const VALID_METRIC_TYPES = Object.values(MetricType);

export function isValidMetricType(value: string): value is MetricType {
  return VALID_METRIC_TYPES.includes(value as MetricType);
}
