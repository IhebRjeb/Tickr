import { UserRole } from '../../domain/value-objects/user-role.vo';

/**
 * User DTO for API responses
 *
 * Excludes sensitive data like password hash and tokens
 */
export class UserDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly phone: string | null;
  readonly isActive: boolean;

  constructor(props: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone: string | null;
    isActive: boolean;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    this.phone = props.phone;
    this.isActive = props.isActive;
  }

  /**
   * Get full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
