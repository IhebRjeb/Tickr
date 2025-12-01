/**
 * User Role Enum
 *
 * Defines the available roles in the system:
 * - ADMIN: Platform administration (full access)
 * - ORGANIZER: Create and manage events
 * - PARTICIPANT: Purchase tickets and attend events
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  PARTICIPANT = 'PARTICIPANT',
}

/**
 * Permission Enum - Defines all available permissions
 */
export enum Permission {
  // User Management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',

  // Event Management
  EVENT_READ = 'event:read',
  EVENT_CREATE = 'event:create',
  EVENT_UPDATE = 'event:update',
  EVENT_DELETE = 'event:delete',
  EVENT_PUBLISH = 'event:publish',

  // Ticket Management
  TICKET_READ = 'ticket:read',
  TICKET_PURCHASE = 'ticket:purchase',
  TICKET_REFUND = 'ticket:refund',
  TICKET_VALIDATE = 'ticket:validate',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Platform
  PLATFORM_SETTINGS = 'platform:settings',
  PLATFORM_AUDIT = 'platform:audit',
}

/**
 * Role-Permission Mapping
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access to everything
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_MANAGE_ROLES,
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_DELETE,
    Permission.EVENT_PUBLISH,
    Permission.TICKET_READ,
    Permission.TICKET_PURCHASE,
    Permission.TICKET_REFUND,
    Permission.TICKET_VALIDATE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.PLATFORM_SETTINGS,
    Permission.PLATFORM_AUDIT,
  ],

  [UserRole.ORGANIZER]: [
    // Own profile management
    Permission.USER_READ,
    Permission.USER_UPDATE,
    // Event management
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_DELETE,
    Permission.EVENT_PUBLISH,
    // Ticket management for own events
    Permission.TICKET_READ,
    Permission.TICKET_REFUND,
    Permission.TICKET_VALIDATE,
    // Analytics for own events
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
  ],

  [UserRole.PARTICIPANT]: [
    // Own profile management
    Permission.USER_READ,
    Permission.USER_UPDATE,
    // Event viewing
    Permission.EVENT_READ,
    // Ticket purchase
    Permission.TICKET_READ,
    Permission.TICKET_PURCHASE,
  ],
};

/**
 * UserRole Value Object
 *
 * Provides role-based access control utilities
 */
export class UserRoleVO {
  private constructor(private readonly role: UserRole) {}

  /**
   * Get the role value
   */
  get value(): UserRole {
    return this.role;
  }

  /**
   * Create a UserRole from string
   */
  static create(role: string): UserRoleVO {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new Error(
        `Invalid role: ${role}. Must be one of: ${Object.values(UserRole).join(', ')}`,
      );
    }
    return new UserRoleVO(role as UserRole);
  }

  /**
   * Create from enum directly
   */
  static fromEnum(role: UserRole): UserRoleVO {
    return new UserRoleVO(role);
  }

  /**
   * Get all permissions for this role
   */
  getPermissions(): Permission[] {
    return ROLE_PERMISSIONS[this.role];
  }

  /**
   * Check if this role has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    return ROLE_PERMISSIONS[this.role].includes(permission);
  }

  /**
   * Check if this role has all of the specified permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  /**
   * Check if this role has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  /**
   * Check if this is an admin role
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if this is an organizer role
   */
  isOrganizer(): boolean {
    return this.role === UserRole.ORGANIZER;
  }

  /**
   * Check if this is a participant role
   */
  isParticipant(): boolean {
    return this.role === UserRole.PARTICIPANT;
  }

  /**
   * Compare with another role
   */
  equals(other: UserRoleVO): boolean {
    return this.role === other.role;
  }

  /**
   * Get role display name
   */
  getDisplayName(): string {
    const names: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.ORGANIZER]: 'Event Organizer',
      [UserRole.PARTICIPANT]: 'Participant',
    };
    return names[this.role];
  }

  /**
   * String representation
   */
  toString(): string {
    return this.role;
  }

  /**
   * Get all available roles
   */
  static getAllRoles(): UserRole[] {
    return Object.values(UserRole);
  }

  /**
   * Get default role for new users
   */
  static getDefaultRole(): UserRole {
    return UserRole.PARTICIPANT;
  }
}
