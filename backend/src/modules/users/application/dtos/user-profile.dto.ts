import { UserRole } from '../../domain/value-objects/user-role.vo';

/**
 * User Profile DTO for detailed user information
 *
 * Includes additional metadata like timestamps
 * Excludes sensitive data like password hash and tokens
 */
export class UserProfileDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly phone: string | null;
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    this.phone = props.phone;
    this.isActive = props.isActive;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Get full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Check if user has logged in before
   */
  get hasLoggedIn(): boolean {
    return this.lastLoginAt !== null;
  }

  /**
   * Get account age in days
   */
  get accountAgeDays(): number {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
