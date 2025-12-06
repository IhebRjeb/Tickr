import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

import { REQUIRE_EMAIL_VERIFIED_KEY } from '../guards/email-verified.guard';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Roles Decorator
 *
 * Specifies required roles for an endpoint.
 * Used with RolesGuard.
 *
 * @param roles - One or more roles required for access
 *
 * @example
 * ```typescript
 * @Roles('ADMIN')
 * @Get('admin-only')
 * adminOnly() { ... }
 *
 * @Roles('ADMIN', 'ORGANIZER')
 * @Get('privileged')
 * privilegedRoute() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Public Decorator
 *
 * Marks an endpoint as public, bypassing JWT authentication.
 * Used with JwtAuthGuard when it's applied globally.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 *
 * @Public()
 * @Post('login')
 * login() { ... }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Skip Email Verification Decorator
 *
 * Marks an endpoint to skip email verification check.
 * Used with EmailVerifiedGuard.
 *
 * @example
 * ```typescript
 * @SkipEmailVerification()
 * @Get('resend-verification')
 * resendVerification() { ... }
 * ```
 */
export const SkipEmailVerification = () =>
  SetMetadata(REQUIRE_EMAIL_VERIFIED_KEY, false);

/**
 * Current User Decorator
 *
 * Extracts the current authenticated user from the request.
 * Can extract specific property if provided.
 *
 * @param data - Optional property name to extract
 *
 * @example
 * ```typescript
 * // Get full user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtUser) { ... }
 *
 * // Get specific property
 * @Get('my-id')
 * getMyId(@CurrentUser('userId') userId: string) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
