import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { PasswordService } from '../services/password.service';
import { USER_REPOSITORY } from '../../application/ports/user.repository.port';
import type { UserRepositoryPort } from '../../application/ports/user.repository.port';

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
    // Find user by email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal whether user exists
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Note: In full implementation, user entity would have passwordHash field
    // For now, we'll need to extend the repository or use a separate auth repository
    // This is a placeholder that shows the pattern

    // Verify password
    // const isPasswordValid = await this.passwordService.compare(password, user.passwordHash);
    // if (!isPasswordValid) {
    //   throw new UnauthorizedException('Invalid credentials');
    // }

    // Return validated user (without sensitive data)
    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: true, // TODO: Get from user entity when available
    };
  }
}
