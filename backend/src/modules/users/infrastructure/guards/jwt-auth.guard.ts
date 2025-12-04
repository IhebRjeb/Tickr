import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * JWT Auth Guard
 *
 * Validates JWT presence and validity for protected routes.
 * Extends Passport's AuthGuard for JWT strategy.
 *
 * Features:
 * - Validates JWT from Authorization header
 * - Attaches user to request on success
 * - Throws 401 if token missing/invalid/expired
 * - Supports @Public() decorator to skip authentication
 *
 * @example
 * ```typescript
 * // Global protection (in module)
 * { provide: APP_GUARD, useClass: JwtAuthGuard }
 *
 * // Per-route protection
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) { ... }
 *
 * // Skip authentication
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determine if route requires authentication
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Delegate to Passport JWT strategy
    return super.canActivate(context);
  }

  /**
   * Handle authentication errors
   *
   * @param err - Error from Passport (if any)
   * @param user - User object (if authenticated)
   * @returns User object
   * @throws UnauthorizedException if authentication fails
   */
  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser,
    _info: unknown,
  ): TUser {
    // Generic error message to avoid information leakage
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
