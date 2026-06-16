/**
 * EntityType Value Object
 *
 * Defines the types of entities that metrics can be associated with.
 */
export enum EntityType {
  EVENT = 'EVENT',
  USER = 'USER',
  ORDER = 'ORDER',
  PLATFORM = 'PLATFORM',
}

const VALID_ENTITY_TYPES = Object.values(EntityType);

export function isValidEntityType(value: string): value is EntityType {
  return VALID_ENTITY_TYPES.includes(value as EntityType);
}
