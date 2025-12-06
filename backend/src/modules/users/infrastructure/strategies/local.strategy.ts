import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { USER_REPOSITORY } from '../../application/ports/user.repository.port';
import type { UserRepositoryPort } from '../../application/ports/user.repository.port';
import { PasswordService } from '../services/password.service';

/**
 * Validated user data returned by LocalStrategy
 */
export interface ValidatedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
}

/**
 * Local Strategy for username/password authentication
 *
 * Used by Passport to validate email and password credentials.
 * Delegates password comparison to PasswordService.
 *
 * @example
 * ```typescript
 * // In controller
 * @UseGuards(AuthGuard('local'))
 * @Post('login')
 * async login(@Request() req) {
 *   return req.user; // ValidatedUser
 * }
 * ```
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordService: PasswordService,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  /**
   * Validate user credentials
   *
   * Called by Passport when authenticating with local strategy.
   * Must return user object on success or throw exception on failure.
   *
   * @param email - User's email address
   * @param password - Plain text password
   * @returns ValidatedUser if credentials are valid
   * @throws UnauthorizedException if credentials are invalid
   */
  async validate(email: string, password: string): Promise<ValidatedUser> {
    // Find user by email with password hash
    const user = await this.userRepository.findByEmailWithPassword(email);

    if (!user) {
      // Don't reveal whether user exists
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if password hash exists
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp (fire and forget)
    this.userRepository.updateLastLogin(user.id).catch(() => {
      // Silently ignore errors - login should not fail if this fails
    });

    // Return validated user (without sensitive data)
    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    };
  }
}
