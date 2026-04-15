/**
 * Cross-module DTOs for Users bounded context queries
 *
 * These types define the data shapes returned by the UserQueryPort.
 * Kept in a model file to avoid naming convention conflicts in port files.
 */

/**
 * Minimal user info needed by the Tickets module
 */
export interface UserInfo {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}
