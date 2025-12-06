import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

/**
 * Request user interface
 */
interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Roles Guard
 *
 * Checks if the authenticated user has one of the required roles.
 * Must be used after JwtAuthGuard to ensure user is attached to request.
 *
 * Features:
 * - Checks user role against decorator-defined required roles
 * - Returns 403 Forbidden if role insufficient
 * - Passes through if no roles required
 *
 * @example
 * ```typescript
 * // Require specific role
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * @Get('admin-only')
 * adminOnly() { ... }
 *
 * // Require one of multiple roles
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN', 'ORGANIZER')
 * @Get('privileged')
 * privilegedRoute() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Check if user has required role
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    // No user attached (JwtAuthGuard should have run first)
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Check if user has required role
    if (!user.role) {
      throw new ForbiddenException('Access denied');
    }

    const hasRole = requiredRoles.some(
      (role) => role.toUpperCase() === user.role.toUpperCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
