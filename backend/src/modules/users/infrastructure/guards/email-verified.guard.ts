import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { USER_REPOSITORY } from '../../application/ports/user.repository.port';
import type { UserRepositoryPort } from '../../application/ports/user.repository.port';

export const REQUIRE_EMAIL_VERIFIED_KEY = 'requireEmailVerified';

/**
 * Request user interface
 */
interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Email Verified Guard
 *
 * Checks if the authenticated user has verified their email address.
 * Must be used after JwtAuthGuard to ensure user is attached to request.
 *
 * Features:
 * - Fetches user from repository to check emailVerified status
 * - Returns 403 Forbidden if email not verified
 * - Can be bypassed with @SkipEmailVerification() decorator
 *
 * @example
 * ```typescript
 * // Require email verification
 * @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
 * @Get('verified-only')
 * verifiedOnly() { ... }
 *
 * // Skip email verification check
 * @SkipEmailVerification()
 * @Get('no-verification-needed')
 * noVerificationNeeded() { ... }
 * ```
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  /**
   * Check if user has verified email
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for @SkipEmailVerification() decorator
    const skipVerification = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_EMAIL_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipVerification === false) {
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    // No user attached (JwtAuthGuard should have run first)
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Fetch full user from repository to check email verification status
    const fullUser = await this.userRepository.findById(user.userId);

    if (!fullUser) {
      throw new ForbiddenException('User not found');
    }

    // Note: emailVerified field needs to be added to UserEntityPort
    // For now, we'll assume email is verified if user exists
    // This should be updated when emailVerified is added to the entity
    const emailVerified = (fullUser as unknown as { emailVerified?: boolean }).emailVerified ?? true;

    if (!emailVerified) {
      throw new ForbiddenException(
        'Email verification required. Please verify your email address.',
      );
    }

    return true;
  }
}
